
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../lib/gemini-models";
import { requireAdmin } from "../../server/next-api-auth";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function flattenChoiceText(blocks: any[]) {
  return blocks
    .filter(b => b.type === "text")
    .map(b => b.value)
    .join(" ");
}

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

      let promptText = `Act as a professional AP Exam Editor.
Your goal is to "Pretty Print" and "Proofread" the following question.

1. LAYOUT: Use double newlines (\\n\\n) to separate stimulus, question text, and code blocks.
2. CLEANUP: Remove "garbage" characters from scraping, fix "the the" style duplicates, and correct grammar/punctuation.
3. STEM: If you see Java code or Math, format it with proper indentation and symbols (e.g., x², not x^2).
4. SUBJECT AGNOSTIC: Treat History quotes, Bio data, and CS code with equal care for readability.

Return ONLY valid JSON:
{
  "question": "...",
  "choices": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." }
}

Question:
`;

      if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
        const questionText = flattenChoiceText(question.prompt_blocks);
        promptText += questionText + "\n\n";
      }

      promptText += "Answer Choices:\n";
      Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
        const choiceText = flattenChoiceText(blocks);
        promptText += `${letter}. ${choiceText}\n`;
      });

      const result = await callWithRetry(
        () => ai.models.generateContent({
          model: selectedModel,
          contents: promptText,
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
      for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
        const correctedBlocks = (blocks as any[]).map((block: any) => {
          if (block.type === "text") {
            return { ...block, value: corrected.choices[letter] || block.value };
          }
          return block;
        });
        updatedChoices[letter] = removeDuplicateBlocks(correctedBlocks);
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
