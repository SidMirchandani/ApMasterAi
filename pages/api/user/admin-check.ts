import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { isAdminEmailFromEnv } from "../../../server/platform-admin";

/**
 * GET /api/user/admin-check
 * Returns { success: true, data: { isAdmin, experimentalFeaturesEnabled } } for authenticated users.
 * experimentalFeaturesEnabled is read from the user doc (default false).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, data: { isAdmin: false, experimentalFeaturesEnabled: false } });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, data: { isAdmin: false, experimentalFeaturesEnabled: false } });
    }
    let experimentalFeaturesEnabled = false;
    let docIsAdmin = false;
    if (decoded.uid) {
      const db = getDb();
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      experimentalFeaturesEnabled = userDoc.exists && userDoc.data()?.experimentalFeaturesEnabled === true;
      docIsAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;
    }
    const admin = isAdminEmailFromEnv(decoded.email) || docIsAdmin;
    return res.status(200).json({
      success: true,
      data: { isAdmin: admin, experimentalFeaturesEnabled },
    });
  } catch {
    return res.status(401).json({ success: false, data: { isAdmin: false, experimentalFeaturesEnabled: false } });
  }
}
