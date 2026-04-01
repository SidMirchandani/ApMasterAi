import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isEnvAdminEmail, isPlatformAdmin } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { uploadExternalImagesInQuestion } from "../../../server/upload-image-from-url";
import { scrapeVarsityForSubject } from "../../../server/scrapers/varsity-tutors";

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

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = getDb();
  if (!(await isPlatformAdmin(db, admin.email, admin.uid))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!isEnvAdminEmail(admin.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { subjectCode } = req.body || {};
  if (!subjectCode || typeof subjectCode !== "string") {
    return res.status(400).json({ error: "Missing subjectCode" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  res.write(":" + " ".repeat(2048) + "\n\n");
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  try {
    sendEvent({
      type: "status",
      phase: "scraping",
      message: `Starting Varsity Tutors scrape for ${subjectCode}...`,
    });

    sendEvent({
      type: "status",
      phase: "scraping",
      message: `Fetching practice index and discovering Varsity tests...`,
    });

    const questions = await scrapeVarsityForSubject(subjectCode);

    sendEvent({
      type: "status",
      phase: "scraping",
      message: `Varsity scraper collected ${questions.length} questions for ${subjectCode}. Beginning import...`,
      current: 0,
      total: questions.length,
      imported: 0,
      skipped: 0,
      errors: 0,
    });

    if (!questions.length) {
      sendEvent({
        type: "error",
        message: `No Varsity Tutors questions found for subject ${subjectCode}`,
      });
      res.end();
      return;
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const BATCH_SIZE = 50;
    let batch = firestore.batch();
    let batchCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const { prompt_blocks, choices } = await uploadExternalImagesInQuestion({
          subject_code: q.subject_code,
          question_id: q.question_id,
          prompt_blocks: q.prompt_blocks,
          choices: q.choices,
        });

        const hasPrompt = prompt_blocks && prompt_blocks.length > 0;
        const hasChoices = choices && Object.keys(choices).length >= 2;
        if (!hasPrompt || !hasChoices) {
          skipped++;
          continue;
        }

        const answerIndex = ["A", "B", "C", "D", "E"].indexOf(q.correct_answer || "");
        const docId = `${q.subject_code}_${q.section_code}_Q${q.question_id}`;

        batch.set(
          firestore.collection("questions").doc(docId),
          {
            subject_code: q.subject_code,
            section_code: q.section_code,
            question_id: q.question_id,
            prompt_blocks,
            choices,
            answerIndex: answerIndex >= 0 ? answerIndex : 0,
            mode: "SECTION",
            test_slug: "",
            tags: ["Source:VarsityTutor"],
            explanation: q.explanation || "",
            updatedAt: new Date(),
            rand: Math.random(),
          },
          { merge: true }
        );

        batchCount++;
        imported++;

        if (batchCount >= BATCH_SIZE) {
          try {
            await batch.commit();
            sendEvent({
              type: "batch",
              phase: "scraping",
              imported,
              skipped,
              errors,
              current: i + 1,
              total: questions.length,
              message: "Scraping questions from Varsity Tutors...",
            });
          } catch (err: any) {
            errors++;
            sendEvent({ type: "error", message: `Batch commit failed: ${err.message}` });
          }
          batch = firestore.batch();
          batchCount = 0;
        }
      } catch (err: any) {
        errors++;
        sendEvent({ type: "error", message: err.message || "Unknown error" });
      }

      sendEvent({
        type: "progress",
        phase: "scraping",
        current: i + 1,
        total: questions.length,
        imported,
        skipped,
        errors,
        message: "Scraping questions from Varsity Tutors...",
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (batchCount > 0) {
      try {
        await batch.commit();
      } catch (err: any) {
        sendEvent({ type: "error", message: `Final batch commit failed: ${err.message}` });
      }
    }

    sendEvent({
      type: "complete",
      imported,
      skipped,
      errors,
      message: `Done! Imported ${imported} Varsity Tutors questions for ${subjectCode}. Skipped ${skipped}, errors ${errors}.`,
    });
  } catch (err: any) {
    sendEvent({
      type: "error",
      message: err.message || "Varsity Tutors scrape failed",
    });
  } finally {
    res.end();
  }
}

