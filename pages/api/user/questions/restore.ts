import { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../../server/firebase-admin";
import { storage } from "../../../../server/storage";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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

    const { questionId } = req.body;
    if (!questionId) {
      return res.status(400).json({ success: false, message: "questionId is required" });
    }

    await storage.restoreToReview(userId, questionId);
    return res.status(200).json({ success: true, message: "Question restored to review" });
  } catch (error) {
    console.error("Error restoring question to review:", error);
    return res.status(500).json({ success: false, message: "Failed to restore question" });
  }
}
