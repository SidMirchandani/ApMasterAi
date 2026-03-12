import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../../lib/gemini-models";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

function flattenPromptText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.value)
    .join(" ");
}

function isQuotaError(error: any): boolean {
  const msg = (error?.message || error?.toString() || "").toLowerCase();
  const status = error?.status || error?.code || error?.httpCode || 0;
  if (status === 429 || status === "429") return true;
  return msg.includes("quota") || msg.includes("rate") || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("too many requests") || msg.includes("limit");
}

async function callWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 5,
  baseDelayMs: number = 5000,
  onRetry?: (attempt: number, waitSec: number) => void
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (isQuotaError(error) && attempt < maxRetries) {
        const waitMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 2000;
        const waitSec = Math.round(waitMs / 1000);
        onRetry?.(attempt + 1, waitSec);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const STUDY_NOTE_PROMPT = `You are an Expert AP Exam Tutor. Your task is to write a "Study Note" that teaches how to answer this type of question on the exam. The note will be used as a reusable study tool—synthesize the concept; do not just repeat the explanation.

Subject: {{SUBJECT}}

Guidelines:
- **Core Concept:** Define the overarching concept or rule being tested.
- **How-To:** Give explicit steps or logic to reach the answer (e.g. "To find X, first identify Y, then…").
- **Quantitative (Chem, Physics, Calc, Econ):** If the item involves math, state the formula, define variables, explain the relationship, and outline calculation steps. Use LaTeX for all equations: inline math with $...$ and display math with $$...$$. Use only these delimiters—no other equation formats. Example: "The relationship is $F = ma$ where $F$ is force."
- **Qualitative (History, Gov, Psych, Bio):** If theoretical, explain historical context, cause–effect, or framework that makes the correct answer right and distractors wrong.
- **Trick:** Briefly call out common traps, misconceptions, or "AP tricks" in the question or wrong choices.
- **Tone:** Scannable, encouraging, test-prep only. 2–3 paragraphs, 5–6 sentences total.
- **Format:** Plain text output only. Use line breaks between paragraphs. No "Study Note:" or section labels in your output. For any mathematics or formulas you must use LaTeX: $...$ for inline, $$...$$ for display. No other equation syntax.

Question:
{{QUESTION}}

Correct Answer: {{ANSWER}}

Explanation:
{{EXPLANATION}}

Study Note (plain text; use $...$ and $$...$$ for equations):`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded: { email?: string | null };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (!isAllowed(decoded.email)) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const { questionIds, model = "2.5lite" } = req.body || {};

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);
  const opts = getGeminiClientOptions();
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
  req.on("close", () => { aborted = true; });

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

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated: 0,
    skipped: 0,
    failed: 0,
    message: `Starting study notes generation for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
      console.log("Client disconnected, stopping study notes generation.");
      break;
    }

    try {
      const doc = await questionsRef.doc(questionId).get();

      if (!doc.exists) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: not found, skipped`,
        });
        continue;
      }

      const question = doc.data() as any;
      const questionText = question.prompt_blocks
        ? flattenPromptText(question.prompt_blocks)
        : (question.prompt || "");
      const answer = question.correct_answer || (question.answerIndex != null ? String.fromCharCode(65 + Number(question.answerIndex)) : "");
      const explanation = question.explanation || "";

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Generating study note for Q${i + 1}/${total}...`,
      });

      const subjectName = getSubjectDisplayName(question.subject_code || "") || "AP";
      const promptText = STUDY_NOTE_PROMPT.replace("{{SUBJECT}}", subjectName)
        .replace("{{QUESTION}}", questionText)
        .replace("{{ANSWER}}", answer)
        .replace("{{EXPLANATION}}", explanation);

      const result = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: selectedModel,
            contents: promptText,
          }),
        5,
        5000,
        (attempt, waitSec) => {
          sendEvent({
            type: "rate_limit",
            current: i + 1,
            total,
            updated,
            skipped,
            failed,
            message: `Rate limit hit — waiting ${waitSec}s before retry ${attempt}/5...`,
          });
        }
      );

      const paragraph = (result.text || "").trim();
      if (!paragraph) {
        failed++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}: Empty response, skipped`,
        });
        continue;
      }

      const existingTags: string[] = question.tags || [];
      const otherTags = existingTags.filter(
        (t: string) => typeof t !== "string" || !t.startsWith("study_note:")
      );
      const updatedTags = [...otherTags, `study_note: ${paragraph}`];

      await doc.ref.update({
        tags: updatedTags,
        updatedAt: new Date(),
      });

      updated++;
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Generated ${updated}/${total - skipped} study notes`,
      });
    } catch (error: any) {
      failed++;
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Q${i + 1}: Failed — ${(error.message || "").substring(0, 80)}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Generated ${updated} study notes. ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}
