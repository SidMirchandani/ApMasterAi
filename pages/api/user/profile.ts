
import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { verifyFirebaseToken } from "../../../server/firebase-admin";

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

    const { displayName, email, photoURL } = req.body;

    if (!displayName || !email) {
      return res.status(400).json({
        success: false,
        message: "Display name and email are required",
      });
    }

    // Split display name into first and last name
    const nameParts = displayName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const db = getDb();
    const userRef = db.collection("users").doc(userId);

    // Check if user exists
    const userDoc = await userRef.get();

    const userData = {
      email,
      displayName,
      firstName,
      lastName,
      photoURL: photoURL || null,
      updatedAt: new Date().toISOString(),
    };

    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        ...userData,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Update existing user document
      await userRef.update(userData);
    }

    return res.status(200).json({
      success: true,
      data: {
        userId,
        firstName,
        lastName,
        displayName,
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
