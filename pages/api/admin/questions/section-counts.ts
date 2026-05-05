import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";
import { getDb } from "../../../../server/db";
import { isPlatformAdmin } from "../../../../server/platform-admin";
import { SUBJECT_SECTIONS } from "../../../../server/subject-sections";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    const db = getDb();
    if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
      return res.status(403).json({ error: "Not an admin" });
    }

    const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : "";
    if (!subject) {
      return res.status(400).json({ error: "Missing subject query parameter" });
    }

    const sections = SUBJECT_SECTIONS[subject];
    if (!sections?.length) {
      return res.status(400).json({ error: "Unknown subject or no sections defined" });
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }

    const { firestore } = firebaseAdmin;
    const data: Record<string, number> = {};

    await Promise.all(
      sections.map(async (s) => {
        const agg = await firestore
          .collection("questions")
          .where("subject_code", "==", subject)
          .where("section_code", "==", s.code)
          .count()
          .get();
        data[s.code] = agg.data().count ?? 0;
      }),
    );

    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    const percentages: Record<string, number> = {};
    for (const [sectionCode, count] of Object.entries(data)) {
      percentages[sectionCode] = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
    }

    const subjectUpper = subject.toUpperCase();
    const overrepresentedSection = Object.entries(data).reduce(
      (best, entry) => (entry[1] > best[1] ? entry : best),
      ["", -1] as [string, number],
    );
    const p1SharePercent = subjectUpper === "APUSH" ? percentages.P1 ?? 0 : undefined;

    return res.status(200).json({
      success: true,
      data,
      diagnostics: {
        total,
        percentages,
        overrepresentedSection: {
          code: overrepresentedSection[0],
          count: overrepresentedSection[1] < 0 ? 0 : overrepresentedSection[1],
        },
        ...(subjectUpper === "APUSH" ? { p1SharePercent } : {}),
      },
    });
  } catch (err) {
    console.error("section-counts:", err);
    return res.status(500).json({ error: "Failed to load section counts" });
  }
}
