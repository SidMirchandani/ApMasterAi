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

    const userId = await getOrCreateUser(decodedToken.uid);
    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      res.status(400).json({ success: false, message: "Valid subject ID is required" });
      return;
    }

    if (req.method === "GET") {
      const unitId = req.query.unitId;
      if (!unitId || typeof unitId !== "string") {
        res.status(400).json({ success: false, message: "unitId is required" });
        return;
      }
      const state = await storage.getUnitQuizState(userId, subjectId, unitId);
      res.status(200).json({ success: true, data: state });
      return;
    }

    if (req.method === "POST") {
      const { unitId, state } = req.body;
      if (!unitId || typeof unitId !== "string" || !state) {
        res.status(400).json({ success: false, message: "unitId and state are required" });
        return;
      }
      if (!state.questionIds || !Array.isArray(state.questionIds) || typeof state.currentQuestionIndex !== "number" || typeof state.userAnswers !== "object") {
        res.status(400).json({ success: false, message: "Invalid state: questionIds, currentQuestionIndex, userAnswers required" });
        return;
      }
      await storage.saveUnitQuizState(userId, subjectId, unitId, {
        questionIds: state.questionIds,
        currentQuestionIndex: state.currentQuestionIndex,
        userAnswers: state.userAnswers || {},
        flaggedQuestions: state.flaggedQuestions,
        timeElapsed: state.timeElapsed,
      });
      res.status(200).json({ success: true });
      return;
    }

    if (req.method === "DELETE") {
      const unitId = req.query.unitId;
      if (!unitId || typeof unitId !== "string") {
        res.status(400).json({ success: false, message: "unitId is required" });
        return;
      }
      await storage.deleteUnitQuizState(userId, subjectId, unitId);
      res.status(200).json({ success: true });
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    return;
  } catch (error) {
    console.error("[unit-quiz-state API] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
}
