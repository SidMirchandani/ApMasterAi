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
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

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
        isAdmin: isAdmin(decodedToken.email ?? userData?.email),
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
