
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName } from "../../lib/gemini-models";

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

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
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

  const { questionIds, model = "2.0" } = req.body || {};

  if (
    !questionIds ||
    !Array.isArray(questionIds) ||
    questionIds.length === 0
  ) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);
  console.log(`Using model: ${selectedModel} (from selection: ${model})`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY in environment" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const { firestore } = firebaseAdmin;
  const questionsRef = firestore.collection("questions");
  const total = questionIds.length;

  console.log(`Generating explanations for ${total} selected questions...`);

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
    message: `Starting explanation generation for ${total} questions...`,
  });

  const BASE_DELAY_MS = 2000;

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
      console.log("Client disconnected, stopping explanation generation.");
      break;
    }

    try {
      const doc = await questionsRef.doc(questionId).get();

      if (!doc.exists) {
        console.log(`Question ${questionId} not found, skipping...`);
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
      
      if (question.explanation && question.explanation.trim() !== '') {
        console.log(
          `Skipping Question ${i + 1}/${total} (ID: ${questionId}) - explanation already exists`,
        );
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: already has explanation, skipped`,
        });
        continue;
      }

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Generating explanation ${i + 1}/${total}...`,
      });

      const promptParts: any[] = [];
      
      let promptText = `You are an expert AP tutor. Generate a clear, structured explanation for this AP question.\n\n`;
      
      if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
        const questionText = flattenChoiceText(question.prompt_blocks);
        promptText += `Question: ${questionText}\n`;
      }
      
      promptParts.push({ text: promptText });
      
      if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
        for (const block of question.prompt_blocks) {
          if (block.type === "image" && block.url) {
            try {
              const base64Data = await fetchImageAsBase64(block.url);
              promptParts.push({
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data
                }
              });
            } catch (err) {
              console.error(`Failed to fetch image ${block.url}:`, err);
            }
          }
        }
      }
      
      let choicesText = `\nAnswer Choices:\n`;
      Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
        const choiceText = flattenChoiceText(blocks);
        choicesText += `${letter}. ${choiceText}\n`;
      });
      
      const correctLabel = String.fromCharCode(65 + question.answerIndex);
      const correctAnswerBlocks = question.choices?.[correctLabel];
      const correctAnswer = correctAnswerBlocks ? flattenChoiceText(correctAnswerBlocks) : "";
      choicesText += `\nCorrect Answer: ${correctLabel}. ${correctAnswer}\n\n`;
      
      promptParts.push({ text: choicesText });
      
      for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
        for (const block of blocks as any[]) {
          if (block.type === "image" && block.url) {
            try {
              const base64Data = await fetchImageAsBase64(block.url);
              promptParts.push({
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data
                }
              });
            } catch (err) {
              console.error(`Failed to fetch choice image ${block.url}:`, err);
            }
          }
        }
      }
      
      promptParts.push({
        text: `\nProvide a concise explanation following this structure (do NOT number the sections):

**Concept**: In 1-2 sentences, briefly explain what concept this question tests.

**Why ${correctLabel} is correct**: Clearly explain why this answer is right.

**Why other choices are wrong**: Briefly explain why each incorrect choice (A, B, C, D, E - except ${correctLabel}) is wrong.

Keep the ENTIRE explanation to about 100-150 words maximum. Be clear, concise, and student-friendly.

Your explanation:`
      });

      const modelInstance = genAI.getGenerativeModel({ model: selectedModel });

      const result = await callWithRetry(
        () => modelInstance.generateContent(promptParts),
        5,
        5000,
        (attempt, waitSec) => {
          console.log(`⏳ Quota limit hit, retry ${attempt}/5 — waiting ${waitSec}s...`);
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

      let explanation = result.response?.text()?.trim() || "";
      explanation = explanation.replace(/^Explanation:\s*/i, "").trim();

      await doc.ref.update({
        explanation,
        updatedAt: new Date(),
      });

      updated++;
      console.log(`✓ Generated explanation for question ${doc.id}`);

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Generated ${updated}/${total - skipped} explanations`,
      });
    } catch (error: any) {
      failed++;
      const isQuota = isQuotaError(error);
      console.error(
        `✗ Failed to generate explanation for ${questionId}:`,
        isQuota ? "Quota exhausted after retries" : error.message,
      );
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: isQuota
          ? `Q${i + 1}: Quota exhausted after retries — skipped`
          : `Q${i + 1}: Failed — ${(error.message || "").substring(0, 80)}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS));
  }

  console.log(`✅ Completed: Generated ${updated}/${total} explanations (${skipped} skipped, ${failed} failed)`);

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Generated ${updated} explanations. ${skipped} skipped (already had one), ${failed} failed.`,
  });

  res.end();
}
