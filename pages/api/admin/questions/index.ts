
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";

function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Auth: Bearer <ID_TOKEN> from Firebase client
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    if (!isAllowed(decoded.email)) return res.status(403).json({ error: "Forbidden" });

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const col = firestore.collection("questions");

    if (req.method === "GET") {
      const limit = Math.min(Number(req.query.limit || 100), 500);
      const snap = await col.orderBy("createdAt", "desc").limit(limit).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ items });
    }

    if (req.method === "POST") {
      const { prompt, choices, answerIndex, explanation = "", tags = [], course = null, chapter = null, difficulty = null } = req.body || {};
      if (!prompt || !Array.isArray(choices) || typeof answerIndex !== "number") {
        return res.status(400).json({ error: "Invalid body" });
      }
      if (answerIndex < 0 || answerIndex >= choices.length) {
        return res.status(400).json({ error: "answerIndex out of range" });
      }

      const doc = col.doc();
      await doc.set({
        prompt,
        choices,
        answerIndex,
        explanation,
        tags,
        course,
        chapter,
        difficulty,
        rand: Math.random(),
        createdAt: new Date(),
      });
      return res.status(201).json({ id: doc.id });
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
