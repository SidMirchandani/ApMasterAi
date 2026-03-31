import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";
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

  const body = req.body || {};
  const wantAdmin = body.isAdmin;
  const wantBanned = body.banned;
  if (typeof wantAdmin !== "boolean" && typeof wantBanned !== "boolean") {
    return res.status(400).json({ error: "Body must include isAdmin and/or banned as boolean" });
  }

  const userRef = db.collection("users").doc(id);
  const targetSnap = await userRef.get();
  if (!targetSnap.exists) {
    return res.status(404).json({ error: "User not found" });
  }

  const targetData = targetSnap.data()!;
  const targetEmail = (targetData.email || targetData.username || "") as string;
  const authUid = ((targetData.firebaseUid as string) || id) as string;

  if (typeof wantAdmin === "boolean" && wantAdmin === false) {
    if (id === decoded.uid && !isAdminEmailFromEnv(decoded.email)) {
      return res.status(403).json({
        error: "You cannot remove your own Firestore admin flag without being on ADMIN_EMAILS.",
      });
    }
  }

  if (wantBanned === true) {
    if (authUid === decoded.uid) {
      return res.status(403).json({ error: "You cannot ban your own account." });
    }
  }

  const firebaseAdmin = getFirebaseAdmin();
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (typeof wantAdmin === "boolean") {
    patch.isAdmin = wantAdmin;
  }
  if (typeof wantBanned === "boolean") {
    patch.banned = wantBanned;
  }

  if (typeof wantBanned === "boolean") {
    if (!firebaseAdmin) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }
    try {
      await firebaseAdmin.auth.updateUser(authUid, { disabled: wantBanned });
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code !== "auth/user-not-found") {
        const msg = e instanceof Error ? e.message : "Auth update failed";
        return res.status(500).json({ error: msg });
      }
    }
  }

  await userRef.update(patch);

  const refreshed = (await userRef.get()).data()!;
  const hasDbAdmin = refreshed.isAdmin === true;
  const hasEnv = isAdminEmailFromEnv(targetEmail);
  const isBanned = refreshed.banned === true;

  return res.status(200).json({
    success: true,
    data: {
      id,
      isAdmin: hasEnv || hasDbAdmin,
      hasEnvAdmin: hasEnv,
      hasDbAdmin: hasDbAdmin,
      status: isBanned ? "banned" : "active",
    },
  });
}
