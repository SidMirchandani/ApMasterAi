
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";

function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    if (!isAllowed(decoded.email)) return res.status(403).json({ error: "Not an admin" });

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const { rows } = req.body;

    if (!Array.isArray(rows)) return res.status(400).json({ error: "Rows required" });

    const batch = firestore.batch();
    let count = 0;

    rows.forEach((r) => {
      if (!r.subject_code || !r.section_code) return;
      
      const docId = `${r.subject_code}_${r.section_code}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

      batch.set(firestore.collection("questions").doc(docId), {
        ...r,
        rand: Math.random(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      count++;
    });

    await batch.commit();
    return res.status(200).json({ success: true, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Bulk insert failed" });
  }
}
