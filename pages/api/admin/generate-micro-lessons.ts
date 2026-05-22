import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../../lib/gemini-models";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { callWithRetry, flattenPromptText } from "../../../server/study-notes-helpers";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { SUBJECT_SECTIONS } from "../../../server/subject-sections";
import { buildMicroLessonPrompt } from "../../../server/micro-lesson-prompt";
import {
  MICRO_LESSONS_COLLECTION,
  microLessonDocId,
  parseGeneratedMicroLesson,
} from "../../../server/micro-lessons";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb();
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (!(await isPlatformAdmin(db, admin.email, admin.uid ?? null))) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const {
    subjectCode,
    sectionCodes,
    forceRegenerate = false,
    model = "2.5lite",
  } = req.body || {};

  if (!subjectCode || typeof subjectCode !== "string") {
    return res.status(400).json({ error: "subjectCode is required" });
  }

  const sections = SUBJECT_SECTIONS[subjectCode];
  if (!sections?.length) {
    return res.status(400).json({ error: `Unknown subject code: ${subjectCode}` });
  }

  const targetSections =
    Array.isArray(sectionCodes) && sectionCodes.length > 0
      ? sections.filter((s) => sectionCodes.includes(s.code))
      : sections;

  if (targetSections.length === 0) {
    return res.status(400).json({ error: "No matching sections to generate" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const { firestore } = firebaseAdmin;
  const questionsRef = firestore.collection("questions");
  const lessonsRef = firestore.collection(MICRO_LESSONS_COLLECTION);
  const selectedModel = getModelName(model);
  const opts = getGeminiClientOptions();
  const ai = new GoogleGenAI({
    apiKey: opts.apiKey,
    ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
  });
  const subjectName = getSubjectDisplayName(subjectCode);

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
  if (typeof (res as { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as { flushHeaders: () => void }).flushHeaders();
  }

  const sendEvent = (data: Record<string, unknown>) => {
    if (aborted) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as { flush?: () => void }).flush === "function") {
        (res as { flush: () => void }).flush();
      }
    } catch {
      /* client gone */
    }
  };

  const total = targetSections.length;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated,
    skipped,
    failed,
    message: `Generating micro-lessons for ${total} sections…`,
  });

  for (let i = 0; i < targetSections.length; i++) {
    if (aborted) break;

    const section = targetSections[i];
    const docId = microLessonDocId(subjectCode, section.code);

    try {
      if (!forceRegenerate) {
        const existing = await lessonsRef.doc(docId).get();
        if (existing.exists && existing.data()?.status === "published") {
          skipped++;
          sendEvent({
            type: "progress",
            current: i + 1,
            total,
            updated,
            skipped,
            failed,
            message: `${section.code}: already published, skipped`,
          });
          continue;
        }
      }

      sendEvent({
        type: "progress",
        current: i,
        total,
        updated,
        skipped,
        failed,
        message: `Generating ${section.name} (${section.code})…`,
      });

      const qSnap = await questionsRef
        .where("subject_code", "==", subjectCode)
        .where("section_code", "==", section.code)
        .limit(5)
        .get();

      const sampleContext = qSnap.docs
        .map((d, idx) => {
          const data = d.data();
          const prompt = flattenPromptText(data.prompt_blocks || []);
          const ans =
            typeof data.answerIndex === "number"
              ? String.fromCharCode(65 + data.answerIndex)
              : "?";
          return `Q${idx + 1}: ${prompt.slice(0, 280)}… (Answer: ${ans})`;
        })
        .join("\n");

      const prompt = buildMicroLessonPrompt({
        subjectName,
        subjectCode,
        sectionName: section.name,
        sectionCode: section.code,
        sampleContext,
      });

      const response = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: selectedModel,
            contents: prompt,
          }),
        5,
        5000,
        (attempt, waitSec) => {
          sendEvent({
            type: "rate_limit",
            message: `Rate limited, retry ${attempt} in ${waitSec}s…`,
          });
        },
      );

      const rawText = (response.text || "").trim();

      const parsed = parseGeneratedMicroLesson(rawText);
      if (!parsed) {
        failed++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `${section.code}: invalid JSON from model`,
        });
        continue;
      }

      const now = new Date();
      await lessonsRef.doc(docId).set(
        {
          subjectCode,
          sectionCode: section.code,
          unitName: section.name,
          title: parsed.title,
          blocks: parsed.blocks,
          estimatedReadMinutes: parsed.estimatedReadMinutes,
          status: "published",
          model: selectedModel,
          generatedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      updated++;
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Published micro-lesson for ${section.code}`,
      });
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `${section.code}: ${msg}`,
      });
    }
  }

  sendEvent({
    type: "done",
    current: total,
    total,
    updated,
    skipped,
    failed,
    message: `Done. Published ${updated}, skipped ${skipped}, failed ${failed}.`,
  });

  res.end();
}
