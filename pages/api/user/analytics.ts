import { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { storage } from "../../../server/storage";

function predictAPScore(accuracy: number): number {
  if (accuracy >= 85) return 5;
  if (accuracy >= 70) return 4;
  if (accuracy >= 55) return 3;
  if (accuracy >= 40) return 2;
  return 1;
}

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

    if (stats.totalAttempted > 0 && subjectId) {
      const accuracy = Math.round((stats.totalCorrect / stats.totalAttempted) * 100);
      const predicted = predictAPScore(accuracy);
      try {
        await storage.saveScoreSnapshot(userId, subjectId, accuracy, predicted, stats.totalAttempted);
      } catch (e) {
        console.error("Failed to save score snapshot:", e);
      }
    }

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error getting analytics:", error);
    return res.status(500).json({ success: false, message: "Failed to get analytics" });
  }
}
