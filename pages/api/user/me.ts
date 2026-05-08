import { NextApiRequest, NextApiResponse } from "next";
import { tryGetDb } from "../../../server/db";
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

    const db = tryGetDb();
    if (!db) {
      const dt = user.decodedToken as Record<string, unknown> | undefined;
      const picture = typeof dt?.picture === "string" ? dt.picture : undefined;
      const name = typeof dt?.name === "string" ? dt.name : undefined;
      return res.status(200).json({
        success: true,
        data: {
          userId,
          email: user.email ?? undefined,
          displayName: name,
          firstName: undefined,
          lastName: undefined,
          photoURL: picture,
          state: null,
          experimentalFeaturesEnabled: false,
          isAdmin: isAdminEmailFromEnv(user.email ?? undefined),
        },
      });
    }

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    await maybeUpdateUserGeoState(db, userId, req);
    const refreshedUserDoc = await db.collection("users").doc(userId).get();
    const userData = refreshedUserDoc.data() ?? userDoc.data();
    const experimentalFeaturesEnabled = userData?.experimentalFeaturesEnabled === true;
    const inferredState =
      typeof userData?.inferredState === "string" && /^[A-Z]{2}$/i.test(userData.inferredState.trim())
        ? userData.inferredState.trim().toUpperCase()
        : null;

    return res.status(200).json({
      success: true,
      data: {
        userId,
        email: userData?.email,
        displayName: userData?.displayName,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        photoURL: userData?.photoURL,
        state: inferredState,
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
