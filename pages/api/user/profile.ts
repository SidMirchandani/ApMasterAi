import { NextApiRequest, NextApiResponse } from "next";
import { tryGetDb } from "../../../server/db";
import { assertNotBanned } from "../../../server/api-user-auth";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { isPlatformAdmin } from "../../../server/platform-admin";
import { maybeUpdateUserGeoState } from "../../../server/user-geo-state";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Get the authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyFirebaseToken(token);
    if (!(await assertNotBanned(res, decodedToken.uid))) return;
    const userId = decodedToken.uid;

    const { displayName, email, photoURL, experimentalFeatures } = req.body;

    // If only updating experimental features (no email), allow and skip profile validation
    const isExperimentalOnly =
      experimentalFeatures !== undefined &&
      email === undefined &&
      displayName === undefined &&
      photoURL === undefined;

    if (!isExperimentalOnly && !email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const db = tryGetDb();
    if (!db) {
      if (isExperimentalOnly) {
        return res.status(503).json({
          success: false,
          message: "Database unavailable; cannot update experimental features",
        });
      }
      const displayNameValue =
        displayName?.trim() || (email as string).split("@")[0] || "User";
      const nameParts = displayNameValue.trim().split(" ");
      return res.status(200).json({
        success: true,
        data: {
          userId,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          displayName: displayNameValue,
          email,
        },
      });
    }

    const userRef = db.collection("users").doc(userId);

    if (isExperimentalOnly) {
      if (!(await isPlatformAdmin(db, decodedToken.email, decodedToken.uid))) {
        return res.status(403).json({ success: false, message: "Only admins can update experimental features" });
      }
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ success: false, message: "User profile not found" });
      }
      await userRef.update({
        experimentalFeaturesEnabled: experimentalFeatures === true,
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({
        success: true,
        data: { experimentalFeaturesEnabled: experimentalFeatures === true },
      });
    }

    // Use displayName or fall back to email prefix for Google users
    const displayNameValue = displayName?.trim() || (email as string).split("@")[0] || "User";

    // Split display name into first and last name
    const nameParts = displayNameValue.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const userData: Record<string, unknown> = {
      email,
      displayName,
      firstName,
      lastName,
      photoURL: photoURL || null,
      firebaseUid: userId,
      updatedAt: new Date().toISOString(),
    };
    if (experimentalFeatures !== undefined && (await isPlatformAdmin(db, decodedToken.email, decodedToken.uid))) {
      userData.experimentalFeaturesEnabled = experimentalFeatures === true;
    }

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        ...userData,
        createdAt: new Date().toISOString(),
      });
    } else {
      await userRef.update(userData);
    }

    await maybeUpdateUserGeoState(db, userId, req);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        firstName,
        lastName,
        displayName: displayNameValue,
        email,
      },
    });
  } catch (error) {
    console.error("Error saving user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
