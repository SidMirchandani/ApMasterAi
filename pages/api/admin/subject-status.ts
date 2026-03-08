import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getAllSubjectCodes } from "../../../server/subjects-helper";

function isAllowed(email?: string | null) {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

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
  if (!decoded || !isAllowed(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  try {
    const allCodes = getAllSubjectCodes();
    const status: Record<string, { hasQuestions: boolean; questionCount: number }> = {};

    for (const code of allCodes) {
      const snapshot = await firestore
        .collection("questions")
        .where("subject_code", "==", code)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const countSnapshot = await firestore
          .collection("questions")
          .where("subject_code", "==", code)
          .count()
          .get();
        status[code] = {
          hasQuestions: true,
          questionCount: countSnapshot.data().count || 0,
        };
      } else {
        status[code] = { hasQuestions: false, questionCount: 0 };
      }
    }

    return res.status(200).json({ success: true, data: status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
