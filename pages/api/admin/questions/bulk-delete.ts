
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";
import { getDb } from "../../../../server/db";
import { isEnvAdminEmail, isPlatformAdmin } from "../../../../server/platform-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    const db = getDb();
    if (!(await isPlatformAdmin(db, decoded.email, decoded.uid))) {
      return res.status(403).json({ 
        error: "Not an admin", 
        email: decoded.email,
      });
    }
    if (!isEnvAdminEmail(decoded.email)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }

    console.log(`Deleting ${ids.length} questions...`);

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batch = firestore.batch();

      batchIds.forEach((id: string) => {
        const docRef = firestore.collection("questions").doc(id);
        batch.delete(docRef);
      });

      await batch.commit();
      deletedCount += batchIds.length;
      console.log(`Deleted ${deletedCount}/${ids.length} questions`);
    }

    return res.status(200).json({ 
      success: true, 
      deleted: deletedCount 
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return res.status(500).json({ error: "Bulk delete failed" });
  }
}
