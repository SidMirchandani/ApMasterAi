import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
    console.log(
      "[unit-progress API] Created new user for Firebase UID:",
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
        "../../../../../server/firebase-admin"
      );
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[unit-progress API] Token verification failed:", error);
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
      case "PUT": {
        const { unitId, mcqScore } = req.body;

        if (!unitId || typeof unitId !== "string") {
          return res.status(400).json({
            success: false,
            message: "Valid unit ID is required",
          });
        }

        if (typeof mcqScore !== "number" || mcqScore < 0 || mcqScore > 100) {
          return res.status(400).json({
            success: false,
            message: "MCQ score must be a number between 0 and 100",
          });
        }

        const updated = await storage.updateUnitProgress(
          userId,
          subjectId,
          unitId,
          mcqScore,
        );

        return res.status(200).json({
          success: true,
          message: "Unit progress updated successfully",
          data: updated,
        });
      }

      case "GET": {
        const unitProgress = await storage.getUnitProgress(userId, subjectId);

        return res.status(200).json({
          success: true,
          data: unitProgress,
        });
      }

      default:
        res.setHeader("Allow", ["PUT", "GET"]);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error("[unit-progress API] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}