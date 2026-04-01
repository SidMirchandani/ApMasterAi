import type { NextApiRequest, NextApiResponse } from "next";
import { isEnvAdminEmail } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res, { bannedVariant: "adminCheck" });
  if (!admin) return;

  return res.status(200).json({
    success: true,
    data: { isEnvAdmin: isEnvAdminEmail(admin.email) },
  });
}
