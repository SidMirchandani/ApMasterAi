import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { requireUser } from "../../../server/next-api-auth";
import { getPublishedMicroLesson } from "../../../server/micro-lessons";

/**
 * GET /api/micro-lessons?subjectCode=APCHEM&sectionCode=IMF
 * Returns published micro-lesson for a unit section (auth required).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const subjectCode =
    typeof req.query.subjectCode === "string" ? req.query.subjectCode.trim() : "";
  const sectionCode =
    typeof req.query.sectionCode === "string" ? req.query.sectionCode.trim() : "";

  if (!subjectCode || !sectionCode) {
    return res.status(400).json({
      success: false,
      message: "subjectCode and sectionCode are required",
    });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ success: false, message: "Firebase not initialized" });
  }

  const lesson = await getPublishedMicroLesson(
    firebaseAdmin.firestore,
    subjectCode,
    sectionCode,
  );

  return res.status(200).json({
    success: true,
    data: lesson,
  });
}
