import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);
  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
  }
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const userId = await getOrCreateUser(decodedToken.uid);
    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({ success: false, message: "Valid subject ID is required" });
    }

    if (req.method === "GET") {
      const progress = await storage.getDiagnosticProgress(userId, subjectId);
      return res.status(200).json({ success: true, data: progress });
    }

    if (req.method === "POST") {
      const { questionIndex, userAnswers, unitDifficultyState, questions } = req.body;
      if (typeof questionIndex !== "number" || !userAnswers || !unitDifficultyState) {
        return res.status(400).json({ success: false, message: "Invalid progress payload" });
      }
      await storage.saveDiagnosticProgress(userId, subjectId, {
        questionIndex,
        userAnswers,
        unitDifficultyState,
        questions: questions || [],
      });
      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      await storage.clearDiagnosticProgress(userId, subjectId);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error("[diagnostic-progress API] Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
