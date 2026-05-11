import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../../../../server/next-api-auth";
import { loadAdminTargetSubject } from "../../../../../../../server/admin-user-read";

function routeParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const userId = routeParam(req.query.id);
  const subjectId = routeParam(req.query.subjectId);
  if (!userId || !subjectId) {
    return res.status(400).json({ success: false, message: "Missing user id or subject id" });
  }

  const loaded = await loadAdminTargetSubject(userId, subjectId);
  if (!loaded) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (!loaded.subjectDoc) {
    return res.status(404).json({ success: false, message: "Subject not found" });
  }

  return res.status(200).json({
    success: true,
    data: loaded.subjectDoc.data().unitProgress || {},
  });
}
