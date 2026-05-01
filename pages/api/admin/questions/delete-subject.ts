import type { NextApiRequest, NextApiResponse } from "next";
import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";
import { getDb } from "../../../../server/db";
import { isPlatformAdmin } from "../../../../server/platform-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded: { email?: string | null; uid?: string };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const db = getDb();
  if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const { subjectCode, scope: scopeRaw } = req.body || {};
  if (!subjectCode) {
    return res.status(400).json({ error: "subjectCode required" });
  }
  const scope: "all" | "vt" | "non_vt" =
    scopeRaw === "vt" ? "vt" : scopeRaw === "non_vt" ? "non_vt" : "all";

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  try {
    let totalDeleted = 0;

    if (scope === "all") {
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
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snapshot.size;
      }
    } else {
      const docMatchesScope = (d: QueryDocumentSnapshot) => {
        const src = d.get("source");
        if (scope === "vt") return src === "VT";
        return src !== "VT";
      };
      let lastDoc: QueryDocumentSnapshot | null = null;
      for (;;) {
        let q = firestore
          .collection("questions")
          .where("subject_code", "==", subjectCode)
          .orderBy(FieldPath.documentId())
          .limit(500);
        if (lastDoc) q = q.startAfter(lastDoc);
        const snapshot = await q.get();
        if (snapshot.empty) break;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const toDelete = snapshot.docs.filter(docMatchesScope);
        if (toDelete.length > 0) {
          const batch = firestore.batch();
          toDelete.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          totalDeleted += toDelete.length;
        }
      }
    }

    return res.status(200).json({
      success: true,
      deleted: totalDeleted,
      subjectCode,
      scope,
    });
  } catch (err: any) {
    console.error("Delete subject questions error:", err);
    return res.status(500).json({ error: "Delete failed: " + err.message });
  }
}
