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
  const adminEmails = process.env.ADMIN_EMAILS || "";
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

function hasDifficultyTag(tags: string[] | undefined | null): boolean {
  if (!tags || !Array.isArray(tags)) return false;
  return tags.some((t) => typeof t === "string" && t.startsWith("difficulty:"));
}

const SYSTEM_PROMPT = `You are an expert AP Exam Subject Matter Expert. Your job is to analyze multiple-choice questions and assign a difficulty rating based on cognitive load, number of steps required, and distractor quality. Review the provided question prompt, choices, and explanation, then output a JSON object with two keys: difficulty_tag (must be exactly "easy", "medium", or "hard") and reasoning (a brief 1-2 sentence explanation of why).

Use this strict rubric:
- EASY: Single-step application of a core concept. Minimal syntactic complexity. No trickery in the distractors. High expected student accuracy (>75%).
- MEDIUM: Requires combining two concepts or performing multiple algebraic/logic steps. Distractors represent common but easily identifiable errors (e.g., standard off-by-one loop errors). Expected student accuracy (50–75%).
- HARD: Highly abstract, requires deep conceptual synthesis, or involves tricky edge cases. Distractors are specifically designed to catch subtle conceptual misunderstandings. Expected student accuracy (<50%).

Output only valid JSON with no other text. Example: {"difficulty_tag":"medium","reasoning":"Requires two steps and common distractor patterns."}`;

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

const VALID_TAGS = new Set(["easy", "medium", "hard"]);

function parseAndValidateResponse(rawText: string): { difficulty_tag: string; reasoning: string } | null {
  try {
    const trimmed = rawText.trim();
    const jsonStr = trimmed.replace(/^[^{]*/, "").replace(/[^}]*$/, "").trim() || trimmed;
    const parsed = JSON.parse(jsonStr) as { difficulty_tag?: string; reasoning?: string };
    const tag = typeof parsed.difficulty_tag === "string" ? parsed.difficulty_tag.toLowerCase().trim() : "";
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "";
    if (!VALID_TAGS.has(tag)) return null;
    const sanitizedReasoning = reasoning.slice(0, 500).replace(/\s+/g, " ");
    return { difficulty_tag: tag, reasoning: sanitizedReasoning || "No reasoning provided." };
  } catch {
    return null;
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

  const { questionIds, model = "2.5lite" } = req.body || {};
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);
  const opts = getGeminiClientOptions();
  if (!opts.apiKey) {
    return res.status(500).json({
      error: "Gemini API key not configured (set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY)",
    });
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

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated: 0,
    skipped: 0,
    failed: 0,
    message: `Starting difficulty tagging for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];
    if (aborted) break;

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
          message: `Skipped ${questionId} (not found)`,
        });
        continue;
      }

      const question = doc.data()!;
      const tags = (question.tags as string[] | undefined) || [];

      if (hasDifficultyTag(tags)) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Skipped ${questionId} (already has difficulty tag)`,
        });
        continue;
      }

      const questionText = getQuestionText(question);
      const explanation = (question.explanation as string) || "";
      const userContent = `Question prompt and choices:\n${questionText}\n\nExplanation:\n${explanation || "(none)"}\n\nOutput only a JSON object with keys difficulty_tag and reasoning.`;

      const resp = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: selectedModel,
            contents: [
              { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userContent }] },
            ],
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

      const rawText = resp.text?.trim() ?? "";
      const parsed = parseAndValidateResponse(rawText);
      if (!parsed) {
        console.error(`Auto-tag difficulty: malformed JSON for question ${questionId}`);
        failed++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}: Invalid response for ${questionId}`,
        });
        continue;
      }

      const newTags = [
        `difficulty:${parsed.difficulty_tag}`,
        `reasoning:${parsed.reasoning}`,
      ];
      await doc.ref.update({
        tags: firestore.FieldValue.arrayUnion(...newTags),
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
        message: `Tagged ${questionId} as ${parsed.difficulty_tag} (${updated}/${total - skipped} updated)`,
      });
    } catch (err: any) {
      failed++;
      console.error(`Auto-tag difficulty failed for question ${questionId}:`, err?.message || err);
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Q${i + 1}: Failed ${questionId} — ${(err?.message || String(err)).slice(0, 80)}`,
      });
    }
  }

  sendEvent({
    type: "complete",
    message: `Difficulty tagging complete. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}.`,
    updated,
    skipped,
    failed,
  });

  res.end();
}
