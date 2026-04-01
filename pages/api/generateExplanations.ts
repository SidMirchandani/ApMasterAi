import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../lib/gemini-models";
import { runExplanationGeneration } from "../../server/explanation-helpers";
import { requireUser } from "../../server/next-api-auth";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

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

  if (
    !questionIds ||
    !Array.isArray(questionIds) ||
    questionIds.length === 0
  ) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`Using model: ${selectedModel} (from selection: ${model})`);
  }

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

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`Generating explanations for ${total} selected questions...`);
  }

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

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated: 0,
    skipped: 0,
    failed: 0,
    message: `Starting explanation generation for ${total} questions...`,
  });

  const { updated, skipped, failed } = await runExplanationGeneration({
    questionIds,
    model: selectedModel,
    ai,
    questionsRef,
    sendEvent,
    skipIfExplanationExists: true,
    isRegenerate: false,
    onAborted: () => aborted,
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `✅ Completed: Generated ${updated}/${total} explanations (${skipped} not found, ${failed} failed)`,
    );
  }

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Generated ${updated} explanations. ${skipped} skipped (not found), ${failed} failed.`,
  });

  res.end();
}
