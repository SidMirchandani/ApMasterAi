import type { NextApiResponse } from "next";
import { getDb } from "./db";
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
  const db = getDb();
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
