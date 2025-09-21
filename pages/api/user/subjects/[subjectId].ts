import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<number> {
  let user = await storage.getUserByUsername(firebaseUid);

  if (!user) {
    user = await storage.createUser({
      username: firebaseUid,
      password: "firebase_auth", // placeholder since Firebase handles auth
    });
    console.log(
      "[subjectId API] Created new user for Firebase UID:",
      firebaseUid,
    );
  }

  return user.id;
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
        "../../../../server/firebase-admin"
      );
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[subjectId API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid);

    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    switch (req.method) {
      case "DELETE": {
        try {
          await storage.removeUserSubject(userId, subjectId);
          return res.status(200).json({
            success: true,
            message: "Subject removed successfully",
          });
        } catch (error) {
          console.error("[subjectId API][DELETE] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to remove subject",
          });
        }
      }

      default:
        res.setHeader("Allow", ["DELETE"]);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error("[subjectId API] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
