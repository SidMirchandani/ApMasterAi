import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../../server/next-api-auth";
import { loadAdminTargetSubjects } from "../../../../../server/admin-user-read";

function routeUserId(req: NextApiRequest): string {
  return typeof req.query.id === "string"
    ? req.query.id
    : Array.isArray(req.query.id)
      ? req.query.id[0]
      : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const userId = routeUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing user id" });
  }

  const loaded = await loadAdminTargetSubjects(userId);
  if (!loaded) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.status(200).json({ success: true, data: loaded.subjects });
}
