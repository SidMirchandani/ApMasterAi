import type { NextApiRequest, NextApiResponse } from "next";
import { DIAGNOSTIC_UNIT_DIFFICULTIES } from "../../../../server/ap-subject-config";

/**
 * GET /api/subject-config/[subjectCode]/unit-difficulties
 * Returns unit (section) difficulties for the given subject code.
 * Single source of truth: server config; no auth required (read-only config).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subjectCode } = req.query;
  if (!subjectCode || typeof subjectCode !== "string") {
    return res.status(400).json({ success: false, message: "Subject code is required" });
  }

  const difficulties = DIAGNOSTIC_UNIT_DIFFICULTIES[subjectCode] ?? null;
  if (!difficulties) {
    return res.status(200).json({
      success: true,
      data: {},
    });
  }

  return res.status(200).json({
    success: true,
    data: difficulties,
  });
}
