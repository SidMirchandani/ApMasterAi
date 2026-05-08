import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName } from "../../lib/gemini-models";
import { requireUser } from "../../server/next-api-auth";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function flattenChoiceText(blocks: any[]) {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.value)
    .join(" ");
}

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
  onRetry?: (attempt: number, waitSec: number) => void,
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (isQuotaError(error) && attempt < maxRetries) {
        const waitMs =
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 2000;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { questionIds, model = "2.5lite" } = req.body || {};

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);

  const ai = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const { firestore } = firebaseAdmin;
  const questionsRef = firestore.collection("questions");
  const total = questionIds.length;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

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
    message: `Starting context generation for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
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
        message: `Generating context for Q${i + 1}/${total}...`,
      });

      let promptText = `You are an AP exam question expert. Analyze this question and its answer choices. If the question appears to reference missing context (like a table, chart, graph, or passage that would normally accompany it), generate that contextual information.

Question:
`;

      if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
        const questionText = flattenChoiceText(question.prompt_blocks);
        promptText += questionText + "\n\n";
      }

      promptText += "Answer Choices:\n";
      Object.entries(question.choices ?? {}).forEach(
        ([letter, blocks]: [string, any]) => {
          const choiceText = flattenChoiceText(blocks);
          promptText += `${letter}. ${choiceText}\n`;
        },
      );

      promptText += `\n\nIf this question needs additional context (table, data, passage, etc.), provide it. Return your response in this JSON format:
{
  "needsContext": true/false,
  "contextType": "text" or "table",
  "context": "the generated contextual information as formatted text or markdown table"
}

If no context is needed, set needsContext to false.`;

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
        },
      );

      let responseText = result.text?.trim() || "";
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const contextData = JSON.parse(responseText);

      if (contextData.needsContext && contextData.context) {
        const contextBlock = {
          type: "text",
          value: `[Context]\n${contextData.context}\n\n`,
        };

        const updatedPromptBlocks = [
          contextBlock,
          ...(question.prompt_blocks || []),
        ];

        await doc.ref.update({
          prompt_blocks: updatedPromptBlocks,
          updatedAt: new Date(),
        });

        updated++;
      } else {
        skipped++;
      }

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Processed ${i + 1}/${total} — ${updated} updated`,
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
    message: `Done! Generated context for ${updated} questions. ${skipped} didn't need context, ${failed} failed.`,
  });

  res.end();
}
