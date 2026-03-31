import { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../../server/api-user-auth";
import { verifyFirebaseToken } from "../../../../server/firebase-admin";
import { storage } from "../../../../server/storage";

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
    if (!(await assertNotBanned(res, decodedToken.uid))) return;
    const userId = decodedToken.uid;

    const subjectId = req.query.subjectId as string | undefined;
    const ids = await storage.getBookmarkedQuestionIds(userId, subjectId);
    return res.status(200).json({ success: true, data: ids });
  } catch (error) {
    console.error("Error getting bookmark ids:", error);
    return res.status(500).json({ success: false, message: "Failed to get bookmark ids" });
  }
}
