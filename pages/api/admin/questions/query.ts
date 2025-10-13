
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getFirebaseAdmin,
  verifyFirebaseToken,
} from "../../../../server/firebase-admin";

function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== "GET") return res.status(405).end();

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    if (!isAllowed(decoded.email))
      return res.status(403).json({ error: "Not an admin" });

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const subject = req.query.subject as string;
    const section = req.query.section as string;

    let q = firestore.collection("questions") as FirebaseFirestore.Query;

    if (subject) q = q.where("subject_code", "==", subject);
    if (section) q = q.where("section_code", "==", section);

    console.log("Query params:", subject, section);
    console.log("Token decoded email:", decoded.email);

    const snap = await q.get();
    console.log("Docs found:", snap.size);

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.status(200).json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Query failed" });
  }
}
