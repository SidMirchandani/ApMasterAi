import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";
import admin from "@/server/firebase-admin";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);
  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
  }
  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`,
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      // Dynamically import firebase-admin to avoid potential issues if it's not available
      const { verifyFirebaseToken } = await import("../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
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

    const { examState } = req.body;
    if (!examState) {
      return res.status(400).json({
        success: false,
        message: "Exam state is required",
      });
    }

    await storage.saveExamState(userId, subjectId, examState);

    return res.status(200).json({
      success: true,
      message: "Exam state saved successfully",
    });
  } catch (error) {
    console.error("[save-exam-state API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}