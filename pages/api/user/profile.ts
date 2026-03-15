import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { verifyFirebaseToken } from "../../../server/firebase-admin";

function isAdmin(email?: string | null): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes((email as string).toLowerCase());
}

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

    const db = getDb();
    const userRef = db.collection("users").doc(userId);

    if (isExperimentalOnly) {
      const admin = isAdmin(decodedToken.email);
      if (!admin) {
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
    if (experimentalFeatures !== undefined && isAdmin(decodedToken.email)) {
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
