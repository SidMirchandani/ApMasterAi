import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";
import { getSectionByCode, getApiCodeForSubject } from "../../../../../server/subjects-helper";
import { computeAdjustedMCQPercentage, computeProjectedAPScore } from "../../../../../server/diagnostic-grading";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  const user = await storage.getUserByFirebaseUid(firebaseUid);
  if (!user) {
    const newUser = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
    return newUser.id;
  }
  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken: { uid: string };
    try {
      const { verifyFirebaseToken } = await import("../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const userId = await getOrCreateUser(decodedToken.uid);

    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    const { questions, userAnswers } = req.body;
    if (!Array.isArray(questions) || !userAnswers || typeof userAnswers !== "object") {
      return res.status(400).json({
        success: false,
        message: "questions and userAnswers are required",
      });
    }

    const apiCode = getApiCodeForSubject(subjectId) || subjectId;

    const sectionBreakdown: {
      [key: string]: { name: string; unitNumber: number; correct: number; total: number; percentage: number };
    } = {};

    questions.forEach((q: { section_code?: string; answerIndex?: number }, idx: number) => {
      const sectionCode = q.section_code || "Unknown";
      const sectionInfo = getSectionByCode(apiCode, sectionCode);
      const name = sectionInfo?.title ?? sectionCode;
      const unitNumber = sectionBreakdown[sectionCode]?.unitNumber ?? Object.keys(sectionBreakdown).length + 1;

      if (!sectionBreakdown[sectionCode]) {
        sectionBreakdown[sectionCode] = {
          name,
          unitNumber,
          correct: 0,
          total: 0,
          percentage: 0,
        };
      }
      sectionBreakdown[sectionCode].total++;

      const correctLabel =
        q.answerIndex != null && q.answerIndex >= 0 && q.answerIndex < 5
          ? String.fromCharCode(65 + q.answerIndex)
          : "";
      if (userAnswers[idx] === correctLabel) {
        sectionBreakdown[sectionCode].correct++;
      }
    });

    Object.values(sectionBreakdown).forEach((section) => {
      section.percentage =
        section.total > 0 ? Math.round((section.correct / section.total) * 100) : 0;
    });

    let score = 0;
    questions.forEach((q: { answerIndex?: number }, idx: number) => {
      const correctLabel =
        q.answerIndex != null && q.answerIndex >= 0 && q.answerIndex < 5
          ? String.fromCharCode(65 + q.answerIndex)
          : "";
      if (userAnswers[idx] === correctLabel) score++;
    });
    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const adjustedMCQPercent = computeAdjustedMCQPercentage(questions, userAnswers);
    const { projectedScore } = computeProjectedAPScore(apiCode, adjustedMCQPercent);

    const testResult = await storage.saveDiagnosticTest(
      userId,
      subjectId,
      score,
      percentage,
      totalQuestions,
      questions,
      userAnswers,
      sectionBreakdown,
      projectedScore
    );

    return res.status(200).json({
      success: true,
      message: "Diagnostic test saved successfully",
      data: testResult,
    });
  } catch (error) {
    console.error("[diagnostic-test API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
