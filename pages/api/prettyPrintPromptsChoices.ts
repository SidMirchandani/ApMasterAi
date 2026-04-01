import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../lib/gemini-models";
import { requireAdmin } from "../../server/next-api-auth";
import { flattenChoiceText } from "../../server/explanation-helpers";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function isQuotaError(error: any): boolean {
  const msg = (error?.message || error?.toString() || "").toLowerCase();
  const status = error?.status || error?.code || error?.httpCode || 0;
  if (status === 429 || status === "429") return true;
  return (
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("limit")
  );
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

function looksLikeLatexServer(content: string): boolean {
  const t = content.trim();
  return t.startsWith("\\") || /\\[a-zA-Z]+|\\[{}^_]|\^{|_\{/.test(content);
}

function normalizeChoiceTextForRender(text: string): string {
  let out = String(text).trim();
  if (!out) return out;

  out = out.replace(/\\\\/g, "\\");
  out = out.replace(/\$\$\s*\$\$/g, " ").replace(/\$\s*\$/g, " ");

  if (/\$[^$]+\$/.test(out)) return out;

  if (looksLikeLatexServer(out)) {
    return `$${out}$`;
  }

  return out;
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { questionIds, model = "2.5lite" } = req.body || {};

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

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
    message: `Starting pretty-print for ${total} questions (text-only; images unchanged)...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
      console.log("Client disconnected, stopping pretty-print.");
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

      const question = doc.data();

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Pretty-printing Q${i + 1}/${total}...`,
      });

      const originalStem =
        flattenChoiceText(question.prompt_blocks || []) ||
        (typeof question.prompt === "string" ? question.prompt : "");

      const originalChoices: Record<string, string> = {};
      const choices = question.choices ?? {};
      for (const letter of LETTERS) {
        const blocks = Array.isArray(choices[letter]) ? choices[letter] : [];
        originalChoices[letter] = flattenChoiceText(blocks) || "";
      }

      const promptParts: any[] = [
        {
          text:
            `Act as a professional AP Exam Editor.\n` +
            `Your goal is to \"Pretty Print\" and \"Proofread\" ONLY the existing text for this question and its choices.\n\n` +
            `1. LAYOUT: Use double newlines (\\n\\n) to separate stimulus, question text, and code blocks.\n` +
            `2. CLEANUP: Remove scraping artifacts, fix duplicate words (\"the the\"), and correct grammar/punctuation.\n` +
            `3. MATH: For any math that already appears in the text, format it neatly using LaTeX inside single dollar signs, e.g. $\\frac{2}{9}$ or $x^2\\sqrt{x^3+1}$.\n` +
            `4. CHOICES: For every answer choice, return a single cleaned-up text string.\n` +
            `5. IMPORTANT: Do NOT infer or invent content from images. Only use the text provided below.\n\n` +
            `Return ONLY valid JSON (no markdown fences). Shape:\n` +
            `{\n  \"question\": \"...\",              // cleaned, student-ready stem\n  \"choices\": { \"A\": \"...\", \"B\": \"...\", \"C\": \"...\", \"D\": \"...\", \"E\": \"...\" }\n}\n\n` +
            `Question stem (text):\n${originalStem || "(no text)"}\n\n` +
            `Current answer choices (text only):\n` +
            LETTERS.map((letter) => `${letter}. ${originalChoices[letter] || "(no text)"}`).join("\n") +
            `\n\nJSON:`,
        },
      ];

      const result = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: selectedModel,
            contents: [{ role: "user", parts: promptParts }],
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
        },
      );

      let responseText = result.text?.trim() || "";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const corrected = JSON.parse(responseText);

      const normalizedStem = normalizeChoiceTextForRender(
        typeof corrected.question === "string" && corrected.question.trim().length > 0
          ? corrected.question
          : originalStem,
      );

      const existingPromptBlocks = Array.isArray(question.prompt_blocks)
        ? question.prompt_blocks
        : [];

      const updatedPromptBlocks: any[] = [];
      let stemApplied = false;

      if (existingPromptBlocks.length > 0) {
        for (const block of existingPromptBlocks) {
          if (block?.type === "text") {
            if (!stemApplied) {
              updatedPromptBlocks.push({
                ...block,
                value: normalizedStem,
              });
              stemApplied = true;
            }
            // Skip subsequent text blocks to avoid duplicates; images stay intact.
          } else {
            updatedPromptBlocks.push(block);
          }
        }
      } else {
        updatedPromptBlocks.push({
          type: "text",
          value: normalizedStem,
        });
      }

      const updatedChoices: any = {};
      for (const letter of LETTERS) {
        const existingBlocks = Array.isArray(choices[letter]) ? choices[letter] : [];
        const originalChoice = originalChoices[letter] || "";
        const newText = corrected.choices?.[letter];
        const finalText = normalizeChoiceTextForRender(
          typeof newText === "string" && newText.trim().length > 0 ? newText : originalChoice,
        );

        if (existingBlocks.length === 0) {
          if (finalText) {
            updatedChoices[letter] = [
              {
                type: "text",
                value: finalText,
              },
            ];
          }
          continue;
        }

        const newBlocks: any[] = [];
        let choiceTextApplied = false;
        for (const block of existingBlocks) {
          if (block?.type === "text") {
            if (!choiceTextApplied) {
              newBlocks.push({
                ...block,
                value: finalText,
              });
              choiceTextApplied = true;
            }
          } else {
            newBlocks.push(block);
          }
        }

        if (!choiceTextApplied && finalText) {
          newBlocks.unshift({
            type: "text",
            value: finalText,
          });
        }

        updatedChoices[letter] = newBlocks;
      }

      const existingTags = question.tags || [];
      const updatedTags = existingTags.includes("prompt_fixed")
        ? existingTags
        : [...existingTags, "prompt_fixed"];

      await doc.ref.update({
        prompt_blocks: updatedPromptBlocks,
        choices: updatedChoices,
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
        message: `Pretty-printed ${updated}/${total - skipped} prompts`,
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

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Pretty-printed ${updated} questions. ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}

