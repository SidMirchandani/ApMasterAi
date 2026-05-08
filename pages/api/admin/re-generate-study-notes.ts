import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import {
  getFirebaseAdmin,
  verifyFirebaseToken,
} from "../../../server/firebase-admin";
import {
  getModelName,
  getGeminiClientOptions,
} from "../../../lib/gemini-models";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import {
  flattenPromptText,
  callWithRetry,
  STUDY_NOTE_PROMPT,
} from "../../../server/study-notes-helpers";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";

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

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded: { email?: string | null; uid?: string };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const db = getDb();
  if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
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
    message: `Starting study notes generation for ${total} questions...`,
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

      const question = doc.data() as any;

      const questionText = question.prompt_blocks
        ? flattenPromptText(question.prompt_blocks)
        : question.prompt || "";
      const answer =
        question.correct_answer ||
        (question.answerIndex != null
          ? String.fromCharCode(65 + Number(question.answerIndex))
          : "");
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

      const subjectName =
        getSubjectDisplayName(question.subject_code || "") || "AP";
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
        },
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
        (t: string) => typeof t !== "string" || !t.startsWith("study_note:"),
      );

      await doc.ref.update({
        test_slug: paragraph,
        tags: otherTags,
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
      try {
        await questionsRef.doc(questionId).set(
          {
            lastVerification: {
              verifiedAt: new Date(),
              source: "study_notes_regen",
              model: selectedModel,
              status: "fail",
              lintErrors: [],
              lintWarnings: [],
              imageErrors: [],
              issues: [
                (error?.message || "Study notes re-generation failed").slice(
                  0,
                  500,
                ),
              ],
              checks: null,
              confidence: null,
            },
            updatedAt: new Date(),
          },
          { merge: true },
        );
      } catch {}
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
