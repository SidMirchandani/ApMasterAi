import { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { storage } from "../../../server/storage";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
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

    const subjectId = req.query.subjectId as string | undefined;
    const stats = await storage.getQuestionStats(userId, subjectId);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error getting analytics:", error);
    return res.status(500).json({ success: false, message: "Failed to get analytics" });
  }
}
