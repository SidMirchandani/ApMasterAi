import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
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
          console.log("[subjectId API][DELETE] Attempting to delete subject with ID:", subjectId);
          await storage.deleteUserSubject(subjectId);
          console.log("[subjectId API][DELETE] Successfully deleted subject:", subjectId);
          return res.status(200).json({
            success: true,
            message: "Subject removed successfully",
          });
        } catch (error) {
          console.error("[subjectId API][DELETE] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to remove subject",
            error: error.message
          });
        }
      }

      case "PUT": {
        try {
          // Verify subject ownership before proceeding with updates
          const subject = await storage.getUserSubject(userId, subjectId);
          if (!subject) {
            return res.status(404).json({
              success: false,
              message: "Subject not found or does not belong to the user.",
            });
          }

          const updates = req.body;
          // Ensure that we are not overwriting essential fields with empty values if not provided
          const sanitizedUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null)
          );

          await storage.updateUserSubject(userId, subjectId, sanitizedUpdates);
          console.log(`[subjectId API][PUT] Successfully updated subject ${subjectId} for user ${userId}`);
          return res.status(200).json({ success: true, message: "Subject updated successfully" });
        } catch (error) {
          console.error(`[subjectId API][PUT] Error updating subject ${subjectId} for user ${userId}:`, error);
          return res.status(500).json({
            success: false,
            message: "Failed to update subject",
            error: error.message,
          });
        }
      }

      default:
        res.setHeader("Allow", ["DELETE", "PUT"]);
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