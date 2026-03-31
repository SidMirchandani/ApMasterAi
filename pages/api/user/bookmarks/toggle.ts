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

    const { questionId, subjectId, unitId, prompt, choices, answerIndex, explanation, sectionCode } = req.body;
    if (!questionId || !subjectId) {
      return res.status(400).json({ success: false, message: "questionId and subjectId are required" });
    }

    const result = await storage.toggleBookmark(userId, {
      questionId, subjectId, unitId: unitId || '', prompt: prompt || '',
      choices: choices || [], answerIndex: answerIndex ?? 0,
      explanation: explanation || '', sectionCode,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle bookmark" });
  }
}
