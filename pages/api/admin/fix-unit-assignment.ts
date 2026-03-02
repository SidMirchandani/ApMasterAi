import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectConfig } from "../../../server/subjects-helper";
import { getGeminiClientOptions } from "../../../lib/gemini-models";

const BATCH_SIZE = 8;

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function isAllowed(email?: string | null) {
  const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

function flattenChoiceText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.value)
    .join(" ");
}

function getQuestionText(question: any): string {
  let text = "";
  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    text += flattenChoiceText(question.prompt_blocks);
  }
  if (question.choices && typeof question.choices === "object") {
    Object.entries(question.choices).forEach(([, blocks]: [string, any]) => {
      text += " " + flattenChoiceText(Array.isArray(blocks) ? blocks : []);
    });
  }
  return text.replace(/\s+/g, " ").trim().slice(0, 3500);
}

interface BatchItem {
  questionId: string;
  question: any;
  subjectCode: string;
  config: ReturnType<typeof getSubjectConfig>;
  validSections: { code: string; title: string }[];
  docRef: { update: (data: object) => Promise<void> };
  currentSection: string;
  questionText: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  let decoded: { email?: string | null };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (!decoded || !isAllowed(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { questionIds } = req.body || {};
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const opts = getGeminiClientOptions();
  if (!opts.apiKey) {
    return res.status(500).json({ error: "Gemini API key not configured (set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY)" });
  }

  const ai = new GoogleGenAI({
    apiKey: opts.apiKey,
    ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
  });

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const { firestore } = firebaseAdmin;
  const questionsRef = firestore.collection("questions");
  const total = questionIds.length;

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }
  const padding = " ".repeat(2048) + "\n";
  res.write(padding);
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  const sendEvent = (data: any) => {
    if (aborted) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch {}
  };

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated: 0,
    skipped: 0,
    failed: 0,
    message: `Starting unit assignment fix for ${total} questions (batches of up to ${BATCH_SIZE})...`,
  });

  // Load all questions and build batch items (or count skips)
  const toProcess: BatchItem[] = [];
  for (const questionId of questionIds) {
    if (aborted) break;
    try {
      const doc = await questionsRef.doc(questionId).get();
      if (!doc.exists) {
        skipped++;
        sendEvent({
          type: "progress",
          current: processed + toProcess.length + skipped + failed,
          total,
          updated,
          skipped,
          failed,
          message: `Skipped ${questionId} (not found)`,
        });
        continue;
      }
      const question = doc.data()!;
      const subjectCode = question.subject_code as string;
      if (!subjectCode) {
        skipped++;
        continue;
      }
      const config = getSubjectConfig(subjectCode);
      if (!config || !config.units || config.units.length === 0) {
        skipped++;
        continue;
      }
      const validSections = config.units.map((u) => ({ code: u.id, title: u.title }));
      const questionText = getQuestionText(question);
      if (!questionText) {
        skipped++;
        continue;
      }
      toProcess.push({
        questionId,
        question,
        subjectCode,
        config,
        validSections,
        docRef: doc.ref,
        currentSection: (question.section_code as string) || "",
        questionText,
      });
    } catch {
      failed++;
    }
  }

  // Group by subject, then chunk into batches of BATCH_SIZE (same subject per batch)
  const bySubject = new Map<string, BatchItem[]>();
  for (const item of toProcess) {
    const list = bySubject.get(item.subjectCode) ?? [];
    list.push(item);
    bySubject.set(item.subjectCode, list);
  }
  const batches: BatchItem[][] = [];
  for (const items of bySubject.values()) {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }
  }

  // Process each batch with a single prompt
  for (const batch of batches) {
    if (aborted) break;
    const first = batch[0];
    const { config: subjectConfig, validSections } = first;
    const sectionList = validSections.map((s) => `${s.code}: ${s.title}`).join("\n");
    const validCodes = new Set(validSections.map((s) => s.code));
    const defaultCode = validSections[0].code;

    const questionBlocks = batch
      .map((item, idx) => `--- Question ${idx + 1} (id: ${item.questionId}) ---\n${item.questionText}`)
      .join("\n\n");

    const prompt = `You are classifying multiple AP exam questions into exactly one unit/section each. All questions below are from the same subject.

Subject: ${subjectConfig!.displayName}

Valid section codes and their titles (use ONLY these codes, one per question):
${sectionList}

Questions (each block is one question; classify each into exactly one section from the list above):

${questionBlocks}

Respond with exactly one section code per question, in order. Format: one code per line, no numbering, no explanation. Line 1 = Question 1, Line 2 = Question 2, etc. Only the section code (e.g. BEC or P1) on each line.`;

    try {
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const rawText = resp.text?.trim() ?? "";
      const lines = rawText
        .split(/\n/)
        .map((l) => l.replace(/^[\d.)\s\-]+/, "").trim().toUpperCase())
        .filter(Boolean);
      const codeRegex = /^[A-Z0-9]{2,5}$/;
      const fallbackRegex = /\b([A-Z]{2,5})\b/;

      for (let idx = 0; idx < batch.length; idx++) {
        const item = batch[idx];
        processed++;
        const line = lines[idx]?.trim().toUpperCase() ?? "";
        let suggestedCode: string | null = null;
        if (line && codeRegex.test(line)) suggestedCode = line;
        else if (line) { const m = line.match(fallbackRegex); suggestedCode = m ? m[1] : null; }
        const newSectionCode = suggestedCode && validCodes.has(suggestedCode) ? suggestedCode : defaultCode;

        if (newSectionCode !== item.currentSection) {
          await item.docRef.update({
            section_code: newSectionCode,
            updatedAt: new Date(),
          });
          updated++;
        } else {
          skipped++;
        }

        sendEvent({
          type: "progress",
          current: processed,
          total,
          updated,
          skipped,
          failed,
          message: `Processed ${processed}/${total} (${item.questionId}: ${item.currentSection || "?"} → ${newSectionCode})`,
        });
      }
    } catch (err: any) {
      for (const item of batch) {
        failed++;
        processed++;
        sendEvent({
          type: "progress",
          current: processed,
          total,
          updated,
          skipped,
          failed,
          message: `Failed batch including ${item.questionId}: ${err?.message || String(err)}`,
        });
      }
    }
  }

  sendEvent({
    type: "complete",
    message: `Unit assignment fix complete. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}.`,
    updated,
    skipped,
    failed,
  });

  res.end();
}
