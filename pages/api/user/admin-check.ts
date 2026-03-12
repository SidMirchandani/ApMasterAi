import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../server/firebase-admin";

function isAdmin(email?: string | null): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

/**
 * GET /api/user/admin-check
 * Returns { success: true, data: { isAdmin: boolean } } for authenticated users.
 * Used by the dashboard to show/hide admin-only actions (e.g. delete subject).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, data: { isAdmin: false } });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, data: { isAdmin: false } });
    }
    const admin = isAdmin(decoded.email);
    return res.status(200).json({ success: true, data: { isAdmin: admin } });
  } catch {
    return res.status(401).json({ success: false, data: { isAdmin: false } });
  }
}
