
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../lib/gemini-models";
import { requireAdmin } from "../../server/next-api-auth";
import { flattenChoiceText, fetchImageAsBase64 } from "../../server/explanation-helpers";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function removeDuplicateBlocks(blocks: any[]): any[] {
  if (!blocks || blocks.length === 0) return blocks;

  const seen = new Set<string>();
  const uniqueBlocks: any[] = [];

  for (const block of blocks) {
    let key: string;
    if (block.type === "text") {
      key = `text:${block.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push({ ...block });
      }
    } else if (block.type === "image") {
      key = `image:${block.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      }
    } else {
      key = JSON.stringify(block);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      }
    }
  }

  return uniqueBlocks;
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
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

/** Match client MarkdownWithMath so KaTeX/remark-math do not choke on double-escapes or empty $ $. */
function normalizeChoiceTextForRender(text: string): string {
  return String(text)
    .trim()
    .replace(/\\\\/g, "\\")
    .replace(/\$\$\s*\$\$/g, " ")
    .replace(/\$\s*\$/g, " ");
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;

async function buildFixPromptsParts(question: any): Promise<any[]> {
  const parts: any[] = [];

  parts.push({
    text:
      `Act as a professional AP Exam Editor.\n` +
      `Your goal is to \"Pretty Print\" and \"Proofread\" the following question AND convert any math/text that currently appears only in images into accessible text.\n\n` +
      `1. LAYOUT: Use double newlines (\\n\\n) to separate stimulus, question text, and code blocks.\n` +
      `2. CLEANUP: Remove scraping artifacts, fix duplicate words (\"the the\"), and correct grammar/punctuation.\n` +
      `3. STEM: For code or math, format neatly. For math formulas, use LaTeX inside single dollar signs, e.g. $\\frac{2}{9}$ or $x^2\\sqrt{x^3+1}$.\n` +
      `4. CHOICES: For every answer choice, return a single text string (no images). If the original choice was an image of a formula, transcribe it as LaTeX in $...$; if it was simple text like \"-6\" or \"6\", keep it plain.\n` +
      `5. ACCESSIBILITY: Do NOT rely on images in your output. All essential content must be in the text you return.\n\n` +
      `Return ONLY valid JSON (no markdown fences):\n` +
      `{\n  \"question\": \"...\",\n  \"choices\": { \"A\": \"...\", \"B\": \"...\", \"C\": \"...\", \"D\": \"...\", \"E\": \"...\" }\n}\n\n` +
      `Question stem (text):\n`,
  });

  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    const questionText = flattenChoiceText(question.prompt_blocks);
    parts.push({ text: `${questionText || "(no text)"}\n\n` });
    for (const block of question.prompt_blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          parts.push({
            inlineData: { mimeType: "image/png", data: base64Data },
          });
          parts.push({ text: "\n(above: image from question stem — for context)\n\n" });
        } catch (e) {
          console.error("fixPromptsChoices: stem image fetch failed", e);
        }
      }
    }
  } else if (typeof question.prompt === "string" && question.prompt.trim()) {
    parts.push({ text: `${question.prompt}\n\n` });
  }

  parts.push({ text: "Current answer choices (text only; images will follow):\n" });

  const choices = question.choices ?? {};
  for (const letter of LETTERS) {
    const blocks = Array.isArray(choices[letter]) ? choices[letter] : [];
    const t = flattenChoiceText(blocks) || "(no text)";
    parts.push({ text: `${letter}. ${t}\n` });
  }
  parts.push({ text: "\n" });

  for (const letter of LETTERS) {
    const blocks = Array.isArray(choices[letter]) ? choices[letter] : [];
    for (const block of blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          parts.push({ text: `Image for answer choice ${letter} only:\n` });
          parts.push({
            inlineData: { mimeType: "image/png", data: base64Data },
          });
          parts.push({ text: "\n" });
        } catch (e) {
          console.error(`fixPromptsChoices: choice ${letter} image fetch failed`, e);
        }
      }
    }
  }

  parts.push({
    text:
      `Now return the JSON object with the \"question\" string and \"choices\" for A–E.\n` +
      `Remember: any math that was in images must now be in LaTeX $...$ so our app can render it. Plain words/numbers stay plain text.\n` +
      `JSON:`,
  });

  return parts;
}

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
    current: 0, total, updated: 0, skipped: 0, failed: 0,
    message: `Starting prompt/choice fixes for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
      console.log("Client disconnected, stopping prompt fixing.");
      break;
    }

    try {
      const doc = await questionsRef.doc(questionId).get();

      if (!doc.exists) {
        skipped++;
        sendEvent({ type: "progress", current: i + 1, total, updated, skipped, failed, message: `Q${i + 1}/${total}: not found, skipped` });
        continue;
      }

      const question = doc.data();

      sendEvent({ type: "progress", current: i + 1, total, updated, skipped, failed, message: `Fixing Q${i + 1}/${total}...` });

      const promptParts = await buildFixPromptsParts(question);

      const result = await callWithRetry(
        () => ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: promptParts }],
        }),
        5, 5000,
        (attempt, waitSec) => {
          sendEvent({ type: "rate_limit", current: i + 1, total, updated, skipped, failed, message: `Rate limit hit — waiting ${waitSec}s before retry ${attempt}/5...` });
        }
      );

      let responseText = result.text?.trim() || "";
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const corrected = JSON.parse(responseText);

      const imageBlocks = (question.prompt_blocks || []).filter((b: any) => b.type !== "text");
      const updatedPromptBlocks = [
        { type: "text", value: corrected.question },
        ...imageBlocks,
      ];

      const deduplicatedPromptBlocks = removeDuplicateBlocks(updatedPromptBlocks);

      const updatedChoices: any = {};
      for (const letter of LETTERS) {
        const existingBlocks = question.choices?.[letter];
        if (!existingBlocks) continue;
        const newText = corrected.choices?.[letter];
        const finalText =
          typeof newText === "string" && newText.trim().length > 0
            ? normalizeChoiceTextForRender(newText)
            : normalizeChoiceTextForRender(flattenChoiceText(existingBlocks));
        updatedChoices[letter] = removeDuplicateBlocks([
          { type: "text", value: finalText },
        ]);
      }

      const existingTags = question.tags || [];
      const updatedTags = existingTags.includes("prompt_fixed") 
        ? existingTags 
        : [...existingTags, "prompt_fixed"];

      await doc.ref.update({
        prompt_blocks: deduplicatedPromptBlocks,
        choices: updatedChoices,
        tags: updatedTags,
        updatedAt: new Date(),
      });

      updated++;
      sendEvent({ type: "progress", current: i + 1, total, updated, skipped, failed, message: `Fixed ${updated}/${total - skipped} prompts` });
    } catch (error: any) {
      failed++;
      sendEvent({ type: "progress", current: i + 1, total, updated, skipped, failed, message: `Q${i + 1}: Failed — ${(error.message || "").substring(0, 80)}` });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  sendEvent({
    type: "complete",
    total, updated, skipped, failed,
    message: `Done! Fixed ${updated} questions. ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}
