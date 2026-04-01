
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getFirebaseAdmin } from "../../../../server/firebase-admin";
import { requireAdmin } from "../../../../server/next-api-auth";

const bulkRowSchema = z.object({
  subject_code: z.string().min(1),
  section_code: z.string().min(1),
  prompt: z.string().min(1),
  choiceA: z.string().optional(),
  choiceB: z.string().optional(),
  choiceC: z.string().optional(),
  choiceD: z.string().optional(),
  choiceE: z.string().optional(),
  correct: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.string().optional(),
  tags: z.string().optional(),
  mode: z.string().optional(),
  test_slug: z.string().optional(),
  question_id: z.string().optional(),
  image_url: z.string().url().optional(),
});

const bulkRequestSchema = z.object({
  rows: z.array(bulkRowSchema).min(1, "rows must contain at least one question"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const admin = await requireAdmin(req, res);
    if (!admin || !admin.isEnvAdmin) return res.status(403).json({ error: "Forbidden" });

    const parseResult = bulkRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
    }

    const { rows } = parseResult.data;

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;

    const batch = firestore.batch();
    let count = 0;

    rows.forEach((r) => {
      // Convert choiceA, choiceB, etc. to choices array
      const choices = [
        r.choiceA,
        r.choiceB,
        r.choiceC,
        r.choiceD,
        r.choiceE,
      ].filter((c): c is string => typeof c === "string" && c.trim().length > 0);

      if (choices.length === 0) return;

      // Convert correct answer letter to index
      const correctLetters = ["A", "B", "C", "D", "E"];
      const answerIndex = r.correct ? correctLetters.indexOf(r.correct.toUpperCase()) : -1;

      // Create deterministic ID to prevent duplicates
      const promptKey = r.prompt.substring(0, 100);
      const docId = `${r.subject_code}_${r.section_code}_${promptKey}`;

      batch.set(firestore.collection("questions").doc(docId), {
        subject_code: r.subject_code,
        section_code: r.section_code,
        prompt: r.prompt,
        choices,
        answerIndex: answerIndex >= 0 ? answerIndex : 0,
        explanation: r.explanation ?? "",
        difficulty: r.difficulty ?? "",
        tags: r.tags ? r.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        mode: r.mode ?? "",
        test_slug: r.test_slug ?? "",
        question_id: r.question_id ?? "",
        image_url: r.image_url ?? "",
        rand: Math.random(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      count++;
    });

    if (count === 0) {
      return res.status(400).json({ error: "No valid rows to import" });
    }

    await batch.commit();
    return res.status(200).json({ success: true, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Bulk insert failed" });
  }
}
