import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../../server/next-api-auth";
import {
  cleanAdminText,
  loadAdminSubjectHistory,
  loadAdminTargetSubjects,
} from "../../../../../server/admin-user-read";

function routeUserId(req: NextApiRequest): string {
  return typeof req.query.id === "string"
    ? req.query.id
    : Array.isArray(req.query.id)
      ? req.query.id[0]
      : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const userId = routeUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  const loaded = await loadAdminTargetSubjects(userId);
  if (!loaded) {
    return res.status(404).json({ error: "User not found" });
  }

  const histories = await Promise.all(loaded.subjectDocs.map(loadAdminSubjectHistory));
  const testHistoryBySubject: Record<string, unknown[]> = {};
  loaded.subjectDocs.forEach((doc, idx) => {
    const sid = cleanAdminText(doc.data().subjectId) || doc.id;
    testHistoryBySubject[sid] = histories[idx] ?? [];
  });

  return res.status(200).json({
    success: true,
    data: {
      user: loaded.target.user,
      subjects: loaded.subjects,
      testHistoryBySubject,
    },
  });
}
