import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { isEnvAdminEmail, isPlatformAdmin } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res, { bannedVariant: "adminCheck" });
  if (!admin) return;

  const db = getDb();
  const canManageContentAndUsers = await isPlatformAdmin(db, admin.email, admin.uid);
  const isEnvAdmin = isEnvAdminEmail(admin.email);

  return res.status(200).json({
    success: true,
    data: {
      adminUid: admin.uid,
      /** Email listed in ADMIN_EMAILS (break-glass / env list). */
      isEnvAdmin,
      /** Full admin UI and mutations: env list or Firestore `users/{uid}.isAdmin`. */
      canManageContentAndUsers,
    },
  });
}
