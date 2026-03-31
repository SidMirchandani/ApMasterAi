import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../server/storage";
import { assertNotBanned } from "../../../../server/api-user-auth";
import { verifyFirebaseToken } from "../../../../server/firebase-admin";
import { getClientIp } from "../../../../server/client-ip";

async function getOrCreateUser(firebaseUid: string, req: NextApiRequest): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`, firebaseUid, getClientIp(req));
    console.log("[subjectId API] Created new user for Firebase UID:", firebaseUid);
  }

  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[subjectId API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!(await assertNotBanned(res, decodedToken.uid))) return;

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid, req);

    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    // Helper: get subject and verify ownership
    const subject = await storage.getUserSubject(subjectId);
    if (!subject || subject.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or does not belong to the user.",
      });
    }

    switch (req.method) {
      case "PUT": {
        try {
          const updates = req.body || {};
          const archived = updates.archived;

          if (typeof archived === "boolean") {
            await storage.updateUserSubject(subjectId, { archived });
            return res.status(200).json({
              success: true,
              message: archived ? "Subject archived" : "Subject restored",
            });
          }

          const sanitizedUpdates = Object.fromEntries(
            Object.entries(updates).filter(
              ([_, value]) => value !== undefined && value !== null
            )
          );
          if (Object.keys(sanitizedUpdates).length === 0) {
            return res.status(400).json({
              success: false,
              message: "No valid updates provided",
            });
          }

          await storage.updateUserSubject(subjectId, sanitizedUpdates);
          return res.status(200).json({
            success: true,
            message: "Subject updated successfully",
          });
        } catch (error) {
          console.error("[subjectId API][PUT] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to update subject",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      case "DELETE": {
        try {
          await storage.deleteUserSubject(subjectId);
          return res.status(200).json({
            success: true,
            message: "Subject removed successfully",
          });
        } catch (error) {
          console.error("[subjectId API][DELETE] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to remove subject",
            error: error instanceof Error ? error.message : "Unknown error",
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
