import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
  }

  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
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
      const { verifyFirebaseToken } = await import("../../../../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid);

    const { subjectId, testId, sectionCode } = req.query;
    if (!subjectId || typeof subjectId !== "string" || !testId || typeof testId !== "string" || !sectionCode || typeof sectionCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID, test ID, and section code are required",
      });
    }

    console.log("📥 Section API Request:", {
      userId: decodedToken.uid,
      subjectId,
      testId,
      sectionCode,
    });

    // Get the full test data
    const testData = await storage.getFullLengthTestResult(
      decodedToken.uid,
      subjectId as string,
      testId as string,
    );

    if (!testData) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    // Filter questions by section_code
    const sectionQuestions = testData.questions.filter(
      (q: any) => q.section_code === sectionCode
    );

    // Filter user answers to match the filtered questions
    const sectionUserAnswers: { [key: number]: string } = {};
    let sectionIndex = 0;

    testData.questions.forEach((q: any, idx: number) => {
      if (q.section_code === sectionCode) {
        sectionUserAnswers[sectionIndex] = testData.userAnswers[idx];
        sectionIndex++;
      }
    });

    console.log("📤 Section API Response:", {
      sectionCode,
      questionCount: sectionQuestions.length,
      userAnswerCount: Object.keys(sectionUserAnswers).length,
      sampleQuestion: sectionQuestions[0] ? {
        section_code: sectionQuestions[0].section_code,
        prompt: sectionQuestions[0].prompt?.substring(0, 50) + "..."
      } : null
    });

    return res.status(200).json({
      success: true,
      data: {
        questions: sectionQuestions,
        userAnswers: sectionUserAnswers,
        unitNumber: testData.sectionBreakdown?.[sectionCode]?.unitNumber,
      },
    });
  } catch (error) {
    console.error("[section-review API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}