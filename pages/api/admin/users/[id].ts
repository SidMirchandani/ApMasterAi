import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../../server/firebase-admin";
import { getDb } from "../../../../server/db";
import {
  isAdminEmailFromEnv,
  isPlatformAdmin,
} from "../../../../server/platform-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : "";
  if (!id) {
    return res.status(400).json({ error: "Missing user id" });
  }

  const token = authHeader.split("Bearer ")[1];
  let decoded: { email?: string | null; uid?: string };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const db = getDb();
  if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { isAdmin: wantAdmin } = req.body || {};
  if (typeof wantAdmin !== "boolean") {
    return res.status(400).json({ error: "Body must include isAdmin: boolean" });
  }

  const userRef = db.collection("users").doc(id);
  const targetSnap = await userRef.get();
  if (!targetSnap.exists) {
    return res.status(404).json({ error: "User not found" });
  }

  const targetData = targetSnap.data()!;
  const targetEmail = (targetData.email || targetData.username || "") as string;

  if (wantAdmin === false) {
    if (id === decoded.uid && !isAdminEmailFromEnv(decoded.email)) {
      return res.status(403).json({
        error: "You cannot remove your own Firestore admin flag without being on ADMIN_EMAILS.",
      });
    }
  }

  await userRef.update({
    isAdmin: wantAdmin,
    updatedAt: new Date().toISOString(),
  });

  const hasEnv = isAdminEmailFromEnv(targetEmail);
  const hasDb = wantAdmin;
  return res.status(200).json({
    success: true,
    data: {
      id,
      isAdmin: hasEnv || hasDb,
      hasEnvAdmin: hasEnv,
      hasDbAdmin: hasDb,
    },
  });
}
