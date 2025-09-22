import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string) {
  let user = await storage.getUserByUsername(firebaseUid);

  if (!user) {
    user = await storage.createUser({
      username: firebaseUid,
      password: "firebase_auth", // placeholder since Firebase handles auth
    });
    console.log(
      "[mastery API] Created new user for Firebase UID:",
      firebaseUid,
    );
  }

  return user;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      const { verifyFirebaseToken } = await import(
        "../../../../../server/firebase-admin"
      );
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[mastery API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const user = await getOrCreateUser(firebaseUid);

    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    switch (req.method) {
      case "PUT": {
        const { masteryLevel } = req.body;

        if (
          typeof masteryLevel !== "number" ||
          masteryLevel < 0 ||
          masteryLevel > 100
        ) {
          return res.status(400).json({
            success: false,
            message: "Mastery level must be a number between 0 and 100",
          });
        }

        const updated = await storage.updateSubjectMasteryLevel(
          user.id,
          subjectId,
          masteryLevel,
        );

        if (!updated) {
          return res.status(404).json({
            success: false,
            message: "Subject not found",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Mastery level updated successfully",
          data: updated,
        });
      }

      default:
        res.setHeader("Allow", ["PUT"]);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error("[mastery API] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
