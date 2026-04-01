import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { isAdminEmailFromEnv } from "../../../server/platform-admin";
import { maybeUpdateUserGeoState } from "../../../server/user-geo-state";
import { requireUser } from "../../../server/next-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = user.uid;

    const db = getDb();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const userData = userDoc.data();
    const experimentalFeaturesEnabled = userData?.experimentalFeaturesEnabled === true;

    await maybeUpdateUserGeoState(db, userId, req);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        email: userData?.email,
        displayName: userData?.displayName,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        photoURL: userData?.photoURL,
        experimentalFeaturesEnabled,
        isAdmin:
          isAdminEmailFromEnv(user.email ?? userData?.email) || userData?.isAdmin === true,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
