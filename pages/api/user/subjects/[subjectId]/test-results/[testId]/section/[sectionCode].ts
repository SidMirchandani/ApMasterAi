import { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../../../server/firebase-admin";
import { storage } from "../../../../../../server/storage";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("[Section Review API] Request params:", { 
      subjectId: req.query.subjectId, 
      testId: req.query.testId, 
      sectionCode: req.query.sectionCode 
    });

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[Section Review API] No auth header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;
    console.log("[Section Review API] User ID:", userId);

    const { subjectId, testId, sectionCode } = req.query;

    if (!subjectId || !testId || !sectionCode) {
      console.log("[Section Review API] Missing parameters");
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Use storage service instead of direct firestore access
    const testData = await storage.getFullLengthTestResult(userId, subjectId as string, testId as string);
    
    if (!testData) {
      console.log("[Section Review API] Test not found");
      return res.status(404).json({ error: "Test not found" });
    }

    console.log("[Section Review API] Test data retrieved:", {
      totalQuestions: testData.questions?.length,
      sectionBreakdown: Object.keys(testData.sectionBreakdown || {})
    });

    // Filter questions and answers for the specific section
    const sectionQuestions = testData?.questions?.filter(
      (q: any) => q.section_code === sectionCode
    ) || [];

    console.log("[Section Review API] Filtered questions for section:", {
      sectionCode,
      filteredCount: sectionQuestions.length,
      allQuestionSections: testData?.questions?.map((q: any) => q.section_code)
    });

    // Filter user answers for this section's questions
    const sectionAnswers: { [key: number]: string } = {};
    testData?.questions?.forEach((q: any, idx: number) => {
      if (q.section_code === sectionCode && testData.userAnswers?.[idx]) {
        sectionAnswers[idx] = testData.userAnswers[idx];
      }
    });

    console.log("[Section Review API] Section answers:", {
      count: Object.keys(sectionAnswers).length,
      answers: sectionAnswers
    });

    // Get section metadata from sectionBreakdown
    const sectionMetadata = testData?.sectionBreakdown?.[sectionCode as string];

    console.log("[Section Review API] Section metadata:", sectionMetadata);

    const responseData = {
      questions: sectionQuestions,
      userAnswers: sectionAnswers,
      unitNumber: sectionMetadata?.unitNumber,
      sectionName: sectionMetadata?.name,
      score: sectionMetadata?.correct,
      totalQuestions: sectionMetadata?.total,
    };

    console.log("[Section Review API] Sending response:", {
      questionCount: responseData.questions.length,
      answerCount: Object.keys(responseData.userAnswers).length
    });

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching section review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}