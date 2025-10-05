
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";

function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    if (!isAllowed(decoded.email)) return res.status(403).json({ error: "Forbidden" });

    const { id } = req.query as { id: string };
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const ref = firestore.collection("questions").doc(id);

    if (req.method === "PUT") {
      const body = req.body || {};
      // Optional: validate edits (e.g., choices & answerIndex bounds)
      if (body.choices && typeof body.answerIndex === "number") {
        if (body.answerIndex < 0 || body.answerIndex >= body.choices.length) {
          return res.status(400).json({ error: "answerIndex out of range" });
        }
      }
      await ref.update({ ...body });
      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      await ref.delete();
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
