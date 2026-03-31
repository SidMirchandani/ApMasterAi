import type { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../../../server/api-user-auth";
import { storage } from "../../../../../server/storage";
import { getClientIp } from "../../../../../server/client-ip";

async function getOrCreateUser(firebaseUid: string, req: NextApiRequest): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);
  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`, undefined, getClientIp(req));
  }
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      const { verifyFirebaseToken } = await import("../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    if (!(await assertNotBanned(res, decodedToken.uid))) return;

    const userId = await getOrCreateUser(decodedToken.uid, req);
    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      res.status(400).json({ success: false, message: "Valid subject ID is required" });
      return;
    }

    if (req.method === "GET") {
      const progress = await storage.getDiagnosticProgress(userId, subjectId);
      res.status(200).json({ success: true, data: progress });
      return;
    }

    if (req.method === "POST") {
      const { questionIndex, userAnswers, unitDifficultyState, questions } = req.body;
      if (typeof questionIndex !== "number" || !userAnswers || !unitDifficultyState) {
        res.status(400).json({ success: false, message: "Invalid progress payload" });
        return;
      }
      await storage.saveDiagnosticProgress(userId, subjectId, {
        questionIndex,
        userAnswers,
        unitDifficultyState,
        questions: questions || [],
      });
      res.status(200).json({ success: true });
      return;
    }

    if (req.method === "DELETE") {
      await storage.clearDiagnosticProgress(userId, subjectId);
      res.status(200).json({ success: true });
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    return;
  } catch (error) {
    console.error("[diagnostic-progress API] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
}
