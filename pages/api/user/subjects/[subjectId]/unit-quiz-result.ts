import type { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../../../server/api-user-auth";
import { storage } from "../../../../../server/storage";
import { getClientIp } from "../../../../../server/client-ip";

async function getOrCreateUser(firebaseUid: string, req: NextApiRequest): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`, undefined, getClientIp(req));
    console.log("[unit-quiz-result API] Created new user for Firebase UID:", firebaseUid);
  }

  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`,
    });
  }

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
    } catch (error) {
      console.error("[unit-quiz-result API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!(await assertNotBanned(res, decodedToken.uid))) return;

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid, req);

    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    const { unitId, sectionCode, score, percentage, totalQuestions, sectionName, unitNumber, userAnswers, questions } = req.body;

    console.log("[unit-quiz-result API] POST payload", {
      userId,
      subjectId,
      unitId,
      sectionCode,
      score,
      percentage,
      totalQuestions,
      sectionName,
      unitNumber,
      hasUserAnswers: !!userAnswers && typeof userAnswers === "object",
      questionsCount: Array.isArray(questions) ? questions.length : 0,
    });

    if (!unitId || typeof unitId !== "string") {
      console.warn("[unit-quiz-result API] Invalid unitId", unitId);
      return res.status(400).json({
        success: false,
        message: "Valid unitId is required",
      });
    }
    if (!sectionCode || typeof sectionCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid sectionCode is required",
      });
    }
    if (typeof score !== "number" || typeof percentage !== "number" || typeof totalQuestions !== "number") {
      console.warn("[unit-quiz-result API] Invalid numeric payload", {
        score,
        percentage,
        totalQuestions,
      });
      return res.status(400).json({
        success: false,
        message: "score, percentage, and totalQuestions must be numbers",
      });
    }

    const result = await storage.saveUnitQuizResult(userId, subjectId, {
      unitId,
      sectionCode,
      score,
      percentage,
      totalQuestions,
      sectionName: typeof sectionName === "string" ? sectionName : undefined,
      unitNumber: typeof unitNumber === "number" ? unitNumber : undefined,
      userAnswers: userAnswers && typeof userAnswers === "object" ? userAnswers : undefined,
      questions: Array.isArray(questions) ? questions : undefined,
    });

    console.log("[unit-quiz-result API] saveUnitQuizResult OK", {
      userId,
      subjectId,
      unitId,
      sectionCode,
      resultId: result.id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[unit-quiz-result API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save unit quiz result",
    });
  }
}
