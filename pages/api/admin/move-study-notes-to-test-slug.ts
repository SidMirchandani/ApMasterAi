import type { NextApiRequest, NextApiResponse } from "next";
import {
  getFirebaseAdmin,
  verifyFirebaseToken,
} from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 60,
};

function getStudyNoteFromTags(tags: string[] | undefined): string {
  if (!Array.isArray(tags)) return "";
  const tag = tags.find(
    (t) => typeof t === "string" && t.startsWith("study_note:"),
  );
  return tag
    ? String(tag)
        .replace(/^study_note:\s*/, "")
        .trim()
    : "";
}

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
  const dbMove = getDb();
  if (!(await isPlatformAdmin(dbMove, decoded.email, decoded.uid ?? null))) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const { questionIds } = req.body || {};
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

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
    message: `Moving study notes to test_slug for ${total} questions...`,
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

      const data = doc.data() as { tags?: string[] };
      const studyNoteText = getStudyNoteFromTags(data.tags);
      if (!studyNoteText) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: no study_note tag, skipped`,
        });
        continue;
      }

      const otherTags = (data.tags || []).filter(
        (t: string) => typeof t !== "string" || !t.startsWith("study_note:"),
      );

      await doc.ref.update({
        test_slug: studyNoteText,
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
        message: `Moved ${updated}/${total} study notes to test_slug`,
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
        message: `Q${i + 1}: Failed — ${(error?.message || "").substring(0, 80)}`,
      });
    }
  }

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Moved ${updated} study notes to test_slug. ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}
