import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";

function isAllowed(email?: string | null) {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = await verifyFirebaseToken(token);
    if (!isAllowed(decoded.email)) {
      return res.status(403).json({ error: "Not an admin" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { subjectCode } = req.body;
  if (!subjectCode) {
    return res.status(400).json({ error: "subjectCode required" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  try {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const snapshot = await firestore
        .collection("questions")
        .where("subject_code", "==", subjectCode)
        .limit(500)
        .get();

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = firestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    return res.status(200).json({
      success: true,
      deleted: totalDeleted,
      subjectCode,
    });
  } catch (err: any) {
    console.error("Delete subject questions error:", err);
    return res.status(500).json({ error: "Delete failed: " + err.message });
  }
}
