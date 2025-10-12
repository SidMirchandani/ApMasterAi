
import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
    console.log("[full-length-test API] Created new user for Firebase UID:", firebaseUid);
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
      const { verifyFirebaseToken } = await import("../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[full-length-test API] Token verification failed:", error);
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

    const { score, percentage, totalQuestions, questions, userAnswers } = req.body;

    if (typeof score !== "number" || typeof percentage !== "number" || typeof totalQuestions !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid test data",
      });
    }

    const testResult = await storage.saveFullLengthTest(
      userId,
      subjectId,
      score,
      percentage,
      totalQuestions,
      questions,
      userAnswers
    );

    console.log("✅ [full-length-test API] Test saved successfully");

    return res.status(200).json({
      success: true,
      message: "Test saved successfully",
      data: testResult,
    });
  } catch (error) {
    console.error("[full-length-test API] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
