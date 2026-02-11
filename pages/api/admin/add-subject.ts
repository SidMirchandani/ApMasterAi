import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectConfig, getAllSubjectCodes } from "../../../server/subjects-helper";
import * as cheerio from "cheerio";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

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

async function probeMaxQuestionId(
  crackApPath: string,
  onProgress?: (message: string) => void
): Promise<number> {
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

  onProgress?.("Checking if questions exist...");
  if (await checkUrl(1)) lastFound = 1;
  else return 0;

  const probePoints = [100, 200, 400, 600, 800, 1000, 1200, 1500, 2000];
  for (const p of probePoints) {
    onProgress?.(`Probing Q${p}... (found up to Q${lastFound} so far)`);
    if (await checkUrl(p)) {
      lastFound = p;
      low = p;
    } else {
      high = p;
      break;
    }
    await sleep(100);
  }

  onProgress?.(`Narrowing range: Q${low}–Q${high}...`);
  while (high - low > 5) {
    const mid = Math.floor((low + high) / 2);
    if (await checkUrl(mid)) {
      lastFound = mid;
      low = mid;
    } else {
      high = mid;
    }
    onProgress?.(`Narrowing: Q${low}–Q${high} (found Q${lastFound})`);
    await sleep(100);
  }

  for (let i = low; i <= high; i++) {
    if (await checkUrl(i)) lastFound = i;
    else break;
    await sleep(50);
  }

  return lastFound;
}

function extractPromptBlocks($: cheerio.CheerioAPI, mcontent: cheerio.Cheerio<any>): Block[] {
  const blocks: Block[] = [];

  mcontent.children().each((_, el) => {
    const $el = $(el);
    if ($el.is("ul") && $el.hasClass("qlist")) return false;

    if ($el.is("p")) {
      let raw = $el.text().trim();
      const lt = raw.toLowerCase();

      if (lt.startsWith("question:")) return;
      if (lt.includes("correct answer")) return;
      if (lt.includes("explanation")) return;

      raw = raw.replace(/^\s*\d+\.\s*/, "");
      if (raw) blocks.push({ type: "text", value: raw });

      $el.find("img").each((_i, img) => {
        const src = $(img).attr("src");
        if (src) {
          const imgUrl = src.startsWith("http") ? src : `${BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
          blocks.push({ type: "image", url: imgUrl });
        }
      });
    }
  });

  return blocks;
}

function extractChoices($: cheerio.CheerioAPI, qlist: cheerio.Cheerio<any>): Record<string, Block[]> {
  const choices: Record<string, Block[]> = {};

  qlist.find("li").each((_, li) => {
    const $li = $(li);
    const raw = $li.text().trim();
    const m = raw.match(/^([A-E])\.\s*(.*)/s);
    if (!m) return;

    const letter = m[1];
    const textPart = m[2].trim();
    const blks: Block[] = [];

    if (textPart) blks.push({ type: "text", value: textPart });

    $li.find("img").each((_i, img) => {
      const src = $(img).attr("src");
      if (src) {
        const imgUrl = src.startsWith("http") ? src : `${BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
        blks.push({ type: "image", url: imgUrl });
      }
    });

    choices[letter] = blks;
  });

  return choices;
}

function assignSection(
  promptBlocks: Block[],
  choices: Record<string, Block[]>,
  sectionKeywords: Record<string, string[]>
): string {
  let text = "";
  for (const blk of promptBlocks) {
    if (blk.type === "text") text += " " + blk.value.toLowerCase();
  }
  for (const key of Object.keys(choices)) {
    for (const blk of choices[key]) {
      if (blk.type === "text") text += " " + blk.value.toLowerCase();
    }
  }

  const scores: Record<string, number> = {};
  for (const code of Object.keys(sectionKeywords)) {
    scores[code] = 0;
    for (const kw of sectionKeywords[code]) {
      if (text.includes(kw.toLowerCase())) scores[code]++;
    }
  }

  let bestCode = Object.keys(sectionKeywords)[0];
  let bestScore = 0;
  for (const code of Object.keys(scores)) {
    if (scores[code] > bestScore) {
      bestScore = scores[code];
      bestCode = code;
    }
  }
  return bestCode;
}

async function scrapeQuestion(
  subjectCode: string,
  crackApPath: string,
  qid: number,
  sectionKeywords: Record<string, string[]>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = `${BASE_URL}/ap/${crackApPath}/question-${qid}-answer-and-explanation.html`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; APMaster/1.0)",
      },
    });
    clearTimeout(timeout);

    if (res.status === 404) return { success: false, error: "not_found" };
    if (!res.ok) return { success: false, error: `http_${res.status}` };

    const html = await res.text();
    const $ = cheerio.load(html);
    const mcontent = $("div.mcontent");
    if (!mcontent.length) return { success: false, error: "no_mcontent" };

    const promptBlocks = extractPromptBlocks($, mcontent);

    const qlist = mcontent.find("ul.qlist");
    if (!qlist.length) return { success: false, error: "no_qlist" };

    const choices = extractChoices($, qlist);

    let correctAnswer: string | null = null;
    const strongEl = mcontent.find("strong").filter((_, el) => {
      return /correct answer/i.test($(el).text());
    });
    if (strongEl.length) {
      const parentText = strongEl.first().parent().text().trim();
      const match = parentText.match(/Correct Answer:\s*([A-E])/);
      if (match) correctAnswer = match[1];
    }

    const sectionCode = assignSection(promptBlocks, choices, sectionKeywords);

    return {
      success: true,
      data: {
        subject_code: subjectCode,
        question_id: qid,
        prompt_blocks: promptBlocks,
        choices,
        correct_answer: correctAnswer,
        section_code: sectionCode,
      },
    };
  } catch (err: any) {
    if (err.name === "AbortError") return { success: false, error: "timeout" };
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

  const maxId = await probeMaxQuestionId(config.crackApPath, (msg) => {
    sendEvent({
      type: "status",
      phase: "probing",
      message: msg,
    });
  });

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

      const hasPrompt = data.prompt_blocks && data.prompt_blocks.length > 0;
      const hasChoices = data.choices && Object.keys(data.choices).length >= 2;
      if (!hasPrompt || !hasChoices) {
        skipped++;
        continue;
      }

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
            phase: "scraping",
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

    if (qid % 5 === 0 || qid === maxId) {
      sendEvent({
        type: "progress",
        phase: "scraping",
        current: qid,
        total: maxId,
        imported,
        skipped,
        errors,
        message: `Processing Q${qid}/${maxId} — ${imported} imported`,
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
