import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
    console.log("[section API] Created new user for Firebase UID:", firebaseUid);
  }

  console.log("[section API] Resolved user:", { firebaseUid, userId: user.id });
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
      userId,
      subjectId as string,
      testId as string,
    );

    console.log("📦 Full test data retrieved:", {
      exists: !!testData,
      totalQuestions: testData?.questions?.length,
      hasUserAnswers: !!testData?.userAnswers,
      sectionCodes: testData?.questions?.map((q: any) => q.section_code).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
    });

    if (!testData) {
      console.log("❌ Test data not found for:", { userId, subjectId, testId });
      console.log("⚠️ This might be a user mismatch. Check if you're logged in with the correct account that took this test.");
      return res.status(404).json({
        success: false,
        message: "Test data not found. You may be logged in with a different account than the one that took this test.",
      });
    }

    // Filter questions by section
    const sectionQuestions = testData.questions.filter(
      (q: any) => q.section_code === sectionCode,
    );

    console.log("🔍 Filtered section questions:", {
      requestedSection: sectionCode,
      foundQuestions: sectionQuestions.length,
      questionIds: sectionQuestions.map((q: any) => q.id),
    });

    // Map user answers to section question indices and add original index to each question
    const sectionUserAnswers: { [key: number]: string } = {};
    const questionsWithOriginalIndex: any[] = [];
    let sectionQuestionIndex = 0;

    testData.questions.forEach((q: any, idx: number) => {
      if (q.section_code === sectionCode) {
        console.log(`📝 Mapping answer for section question ${sectionQuestionIndex}:`, {
          originalIndex: idx,
          userAnswer: testData.userAnswers[idx],
          questionId: q.id,
        });
        sectionUserAnswers[sectionQuestionIndex] = testData.userAnswers[idx];
        questionsWithOriginalIndex.push({
          ...q,
          originalTestIndex: idx, // Add original position in full test
        });
        sectionQuestionIndex++;
      }
    });

    const sectionInfo: Record<
      string,
      { name: string; unitNumber: number }
    > = {
      BEC: { name: "Basic Economic Concepts", unitNumber: 1 },
      EIBC: { name: "Economic Indicators & Business Cycle", unitNumber: 2 },
      NIPD: { name: "National Income & Price Determination", unitNumber: 3 },
      FS: { name: "Financial Sector", unitNumber: 4 },
      LRCSP: {
        name: "Long-Run Consequences of Stabilization Policies",
        unitNumber: 5,
      },
      OEITF: {
        name: "Open Economy - International Trade & Finance",
        unitNumber: 6,
      },
    };

    const info = sectionInfo[sectionCode as string] || {
      name: sectionCode as string,
      unitNumber: 0,
    };

    // For "all" section, return entire test
      if (sectionCode === "all") {
        console.log("📤 Returning full test data for 'all' section");
        return res.status(200).json({
          success: true,
          data: {
            questions: testData.questions,
            userAnswers: testData.userAnswers,
            sectionBreakdown: testData.sectionBreakdown,
          },
        });
      }

    const responseData = {
      questions: questionsWithOriginalIndex, // Use questionsWithOriginalIndex here
      userAnswers: sectionUserAnswers,
      unitNumber: info.unitNumber,
      sectionName: info.name,
    };

    console.log("✅ Sending section response:", {
      questionCount: responseData.questions.length,
      answerCount: Object.keys(responseData.userAnswers).length,
      unitNumber: responseData.unitNumber,
      sectionName: responseData.sectionName,
    });

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("[section-review API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}