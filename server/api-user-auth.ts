import type { NextApiResponse } from "next";
import { tryGetDb } from "./db";
import { isUserBanned } from "./user-ban";

export type BannedResponseVariant = "default" | "adminCheck";

/**
 * @returns true if the user may proceed; false if banned (response already sent).
 */
export async function assertNotBanned(
  res: NextApiResponse,
  uid: string,
  variant: BannedResponseVariant = "default",
): Promise<boolean> {
  const db = tryGetDb();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable",
      });
      return false;
    }
    console.warn(
      "[assertNotBanned] Firestore unavailable; skipping ban check (non-production)",
    );
    return true;
  }
  if (!(await isUserBanned(db, uid))) return true;
  if (variant === "adminCheck") {
    res.status(403).json({
      success: false,
      message: "Account suspended",
      data: { isAdmin: false, experimentalFeaturesEnabled: false },
    });
  } else {
    res.status(403).json({ success: false, message: "Account suspended" });
  }
  return false;
}
