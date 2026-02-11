import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectConfig, getAllSubjectCodes } from "../../../server/subjects-helper";
import * as cheerio from "cheerio";

function isAllowed(email?: string | null) {
  const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

type Block = { type: "text"; value: string } | { type: "image"; url: string };

const BASE_URL = "https://www.crackap.com";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeMaxQuestionId(crackApPath: string): Promise<number> {
  let low = 1;
  let high = 2000;
  let lastFound = 0;

  const checkUrl = async (id: number): Promise<boolean> => {
    try {
      const url = `${BASE_URL}/ap/${crackApPath}/question-${id}-answer-and-explanation.html`;
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      return res.ok;
    } catch {
      return false;
    }
  };

  if (await checkUrl(1)) lastFound = 1;
  else return 0;

  const probePoints = [100, 200, 400, 600, 800, 1000, 1200, 1500, 2000];
  for (const p of probePoints) {
    if (await checkUrl(p)) {
      lastFound = p;
      low = p;
    } else {
      high = p;
      break;
    }
    await sleep(100);
  }

  while (high - low > 5) {
    const mid = Math.floor((low + high) / 2);
    if (await checkUrl(mid)) {
      lastFound = mid;
      low = mid;
    } else {
      high = mid;
    }
    await sleep(100);
  }

  for (let i = low; i <= high; i++) {
    if (await checkUrl(i)) lastFound = i;
    else break;
    await sleep(50);
  }

  return lastFound;
}

function classifyQuestion(text: string, sectionKeywords: Record<string, string[]>): string {
  const lower = text.toLowerCase();
  let bestSection = Object.keys(sectionKeywords)[0] || "UNKNOWN";
  let bestScore = 0;

  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.includes(" ") ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSection = section;
    }
  }

  return bestSection;
}

async function scrapeQuestion(
  subjectCode: string,
  crackApPath: string,
  qid: number,
  sectionKeywords: Record<string, string[]>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = `${BASE_URL}/ap/${crackApPath}/question-${qid}-answer-and-explanation.html`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return { success: false, error: "not_found" };

    const html = await res.text();
    if (html.includes("Page not found") || html.includes("404")) {
      return { success: false, error: "not_found" };
    }

    const $ = cheerio.load(html);
    const promptBlocks: Block[] = [];
    const questionDiv = $(".question-content, .entry-content, .post-content, article").first();

    questionDiv.find("p, li, h2, h3, h4, div.question-text").each((_: any, el: any) => {
      const text = $(el).text().trim();
      if (text && text.length > 5) {
        if (text.match(/^(A|B|C|D|E)\.\s/) || text.match(/^\(?(A|B|C|D|E)\)?\s/)) return;
        if (text.startsWith("Answer:") || text.startsWith("Explanation:")) return;
        promptBlocks.push({ type: "text", value: text });
      }
      $(el).find("img").each((_: any, img: any) => {
        const src = $(img).attr("src");
        if (src) {
          const fullUrl = src.startsWith("http") ? src : `${BASE_URL}${src}`;
          promptBlocks.push({ type: "image", url: fullUrl });
        }
      });
    });

    questionDiv.find("img").each((_: any, img: any) => {
      const src = $(img).attr("src");
      if (src && !promptBlocks.some(b => b.type === "image" && b.url === (src.startsWith("http") ? src : `${BASE_URL}${src}`))) {
        const fullUrl = src.startsWith("http") ? src : `${BASE_URL}${src}`;
        promptBlocks.push({ type: "image", url: fullUrl });
      }
    });

    const choices: Record<string, Block[]> = { A: [], B: [], C: [], D: [], E: [] };
    const choiceRegex = /^\(?(A|B|C|D|E)\)?[\.\)]\s*(.+)/;

    questionDiv.find("p, li, span").each((_: any, el: any) => {
      const text = $(el).text().trim();
      const match = text.match(choiceRegex);
      if (match) {
        const letter = match[1];
        const choiceText = match[2].trim();
        if (choiceText && choices[letter]) {
          choices[letter] = [{ type: "text", value: choiceText }];
        }
      }
    });

    let correctAnswer = "";
    const answerEl = $("strong, b, .answer, .correct-answer").filter(function(this: any) {
      return /answer/i.test($(this).parent().text()) || /correct/i.test($(this).text());
    });

    answerEl.each(function(this: any) {
      const text = $(this).text().trim();
      const letterMatch = text.match(/\b([A-E])\b/);
      if (letterMatch && !correctAnswer) {
        correctAnswer = letterMatch[1];
      }
    });

    if (!correctAnswer) {
      const fullText = $.text();
      const answerMatch = fullText.match(/(?:answer|correct)[:\s]*\(?([A-E])\)?/i);
      if (answerMatch) correctAnswer = answerMatch[1];
    }

    const fullQuestionText = promptBlocks
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; value: string }).value)
      .join(" ") +
      " " +
      Object.values(choices)
        .flat()
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; value: string }).value)
        .join(" ");

    const sectionCode = classifyQuestion(fullQuestionText, sectionKeywords);

    return {
      success: true,
      data: {
        subject_code: subjectCode,
        section_code: sectionCode,
        prompt_blocks: promptBlocks,
        choices,
        correct_answer: correctAnswer,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  if (!decoded || !isAllowed(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { subjectCode } = req.body;

  if (!subjectCode) {
    return res.status(400).json({ error: "Missing subjectCode" });
  }

  const config = getSubjectConfig(subjectCode);
  if (!config) {
    return res.status(400).json({
      error: "Subject not found",
      available: getAllSubjectCodes(),
    });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  sendEvent({
    type: "status",
    phase: "probing",
    message: `Discovering question range for ${config.displayName} on CrackAP...`,
  });

  const maxId = await probeMaxQuestionId(config.crackApPath);

  if (maxId === 0) {
    sendEvent({
      type: "error",
      message: `No questions found on CrackAP for path "${config.crackApPath}"`,
    });
    res.end();
    return;
  }

  sendEvent({
    type: "status",
    phase: "scraping",
    message: `Found ${maxId} potential questions. Starting scrape...`,
    maxId,
  });

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let consecutiveNotFound = 0;
  const BATCH_SIZE = 50;
  let batch = firestore.batch();
  let batchCount = 0;

  for (let qid = 1; qid <= maxId; qid++) {
    const result = await scrapeQuestion(
      config.subjectCode,
      config.crackApPath,
      qid,
      config.sectionKeywords
    );

    if (result.success && result.data) {
      consecutiveNotFound = 0;
      const data = result.data;
      const answerIndex = ["A", "B", "C", "D", "E"].indexOf(data.correct_answer || "");
      const docId = `${data.subject_code}_${data.section_code}_Q${qid}`;

      batch.set(firestore.collection("questions").doc(docId), {
        subject_code: data.subject_code,
        section_code: data.section_code,
        question_id: qid,
        prompt_blocks: data.prompt_blocks,
        choices: data.choices,
        answerIndex: answerIndex >= 0 ? answerIndex : 0,
        mode: "SECTION",
        test_slug: "",
        tags: [],
        updatedAt: new Date(),
        rand: Math.random(),
      }, { merge: true });

      batchCount++;
      imported++;

      if (batchCount >= BATCH_SIZE) {
        try {
          await batch.commit();
          sendEvent({
            type: "batch",
            imported,
            skipped,
            errors,
            current: qid,
            total: maxId,
            message: `Committed batch — ${imported} imported so far`,
          });
        } catch (err: any) {
          sendEvent({ type: "error", message: `Batch commit failed: ${err.message}` });
        }
        batch = firestore.batch();
        batchCount = 0;
      }
    } else {
      if (result.error === "not_found") {
        consecutiveNotFound++;
        skipped++;
      } else {
        errors++;
      }
    }

    if (qid % 25 === 0 || qid === maxId) {
      sendEvent({
        type: "progress",
        current: qid,
        total: maxId,
        imported,
        skipped,
        errors,
        message: `Processing Q${qid}/${maxId}...`,
      });
    }

    if (consecutiveNotFound >= 50) {
      sendEvent({
        type: "info",
        message: `50 consecutive not-found — stopping early at Q${qid}`,
      });
      break;
    }

    await sleep(200);
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
    } catch (err: any) {
      sendEvent({ type: "error", message: `Final batch commit failed: ${err.message}` });
    }
  }

  sendEvent({
    type: "complete",
    imported,
    skipped,
    errors,
    message: `Done! Imported ${imported} questions for ${config.displayName}. Skipped ${skipped}, errors ${errors}.`,
  });

  res.end();
}
