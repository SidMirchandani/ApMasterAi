import { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { storage } from "../../../server/storage";
import { getApiCodeForSubject } from "../../../server/subjects-helper";
import { percentageToAPScore } from "../../../server/ap-subject-config";

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

    if (stats.totalAttempted >= 25 && subjectId) {
      const subjectCode = getApiCodeForSubject(subjectId);
      const curvePredicted = subjectCode ? percentageToAPScore(stats.accuracy, subjectCode) : null;
      const predicted = curvePredicted ?? (stats.accuracy >= 85 ? 5 : stats.accuracy >= 70 ? 4 : stats.accuracy >= 55 ? 3 : stats.accuracy >= 40 ? 2 : 1);
      try {
        await storage.backfillScoreSnapshots(userId, subjectId, stats.accuracy, predicted, stats.totalAttempted);
      } catch (e) {
        console.error("Failed to save score snapshots:", e);
      }
    }

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error getting analytics:", error);
    return res.status(500).json({ success: false, message: "Failed to get analytics" });
  }
}
