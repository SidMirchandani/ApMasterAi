
import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../../server/storage";

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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
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
      const { verifyFirebaseToken } = await import("../../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid);

    const { subjectId, testId } = req.query;
    if (!subjectId || typeof subjectId !== "string" || !testId || typeof testId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID and test ID are required",
      });
    }

    const testResult = await storage.getFullLengthTestResult(userId, subjectId, testId);

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: "Test result not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: testResult,
    });
  } catch (error) {
    console.error("[test-results API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
