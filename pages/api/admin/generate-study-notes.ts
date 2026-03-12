import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../../lib/gemini-models";

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

const STUDY_NOTE_PROMPT = `You are writing a Study Note for someone who has NOT studied this topic yet. Your goal is to explain the core concept so they can understand it on first read.

Instructions:
- Extract the main idea being tested and write a single Study Note paragraph (max 3–4 sentences).
- Use simple, clear language: short sentences, everyday words where possible. Avoid jargon unless necessary; when you use a technical term, briefly explain it in plain language.
- Keep all technical details and facts accurate—simplify how you say it, not what you say.
- Do not mention the specific question or answer choices.
- State the concept as a clear takeaway: what they need to know and why it matters.
- Format for readability: use line breaks if it helps; no labels or "Study Note:" prefix in your output.

Question:
{{QUESTION}}

Correct Answer: {{ANSWER}}

Explanation:
{{EXPLANATION}}

Study Note (plain text only):`;

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

      const promptText = STUDY_NOTE_PROMPT.replace("{{QUESTION}}", questionText)
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
