import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getAllSubjectCodes } from "../../../server/subjects-helper";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  const db = getDb();
  if (!decoded || !(await isPlatformAdmin(db, decoded.email, decoded.uid))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  try {
    const allCodes = getAllSubjectCodes();
    const status: Record<
      string,
      {
        hasQuestions: boolean;
        questionCount: number;
        crackApCount: number;
        varsityCount: number;
      }
    > = {};

    for (const code of allCodes) {
      const totalSnapshot = await firestore
        .collection("questions")
        .where("subject_code", "==", code)
        .count()
        .get();
      const totalCount = totalSnapshot.data().count || 0;

      const varsitySnapshot = await firestore
        .collection("questions")
        .where("subject_code", "==", code)
        .where("tags", "array-contains", "Source:VarsityTutor")
        .count()
        .get();
      const varsityCount = varsitySnapshot.data().count || 0;

      const crackApCount = Math.max(totalCount - varsityCount, 0);

      status[code] = {
        hasQuestions: totalCount > 0,
        questionCount: totalCount,
        crackApCount,
        varsityCount,
      };
    }

    return res.status(200).json({ success: true, data: status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
