import { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../../server/api-user-auth";
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
    if (!(await assertNotBanned(res, decodedToken.uid))) return;
    const userId = decodedToken.uid;

    const { questionId, subjectId, unitId, correct, timeSpentSec, sectionCode, prompt, choices, answerIndex, explanation } = req.body;
    if (!questionId || !subjectId) {
      return res.status(400).json({ success: false, message: "questionId and subjectId are required" });
    }

    await storage.trackQuestionPerformance(userId, {
      questionId, subjectId, unitId: unitId || '',
      correct: !!correct, timeSpentSec: timeSpentSec || 0,
      sectionCode, prompt, choices, answerIndex, explanation,
    });

    return res.status(200).json({ success: true, message: "Question performance tracked" });
  } catch (error) {
    console.error("Error tracking question:", error);
    return res.status(500).json({ success: false, message: "Failed to track question" });
  }
}
