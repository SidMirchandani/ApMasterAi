import type { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../../../../../../server/api-user-auth";
import { storage } from "../../../../../../../../server/storage";
import { getClientIp } from "../../../../../../../../server/client-ip";

async function getOrCreateUser(
  firebaseUid: string,
  req: NextApiRequest,
): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(
      firebaseUid,
      `${firebaseUid}@firebase.user`,
      undefined,
      getClientIp(req),
    );
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
      const { verifyFirebaseToken } =
        await import("../../../../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!(await assertNotBanned(res, decodedToken.uid))) return;

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid, req);

    const { subjectId, testId, sectionCode } = req.query;
    if (
      !subjectId ||
      typeof subjectId !== "string" ||
      !testId ||
      typeof testId !== "string" ||
      !sectionCode ||
      typeof sectionCode !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID, test ID, and section code are required",
      });
    }

    // Get the full test data (full-length, diagnostic, or unit quiz)
    let testData = await storage.getFullLengthTestResult(
      userId,
      subjectId as string,
      testId as string,
    );
    if (!testData && (testId as string).startsWith("diag_")) {
      testData = await storage.getDiagnosticTestResult(
        userId,
        subjectId as string,
        testId as string,
      );
    }
    if (!testData && (testId as string).startsWith("unit_")) {
      const unitResult = await storage.getUnitQuizResult(
        userId,
        subjectId as string,
        testId as string,
      );
      if (
        unitResult &&
        unitResult.sectionCode === sectionCode &&
        Array.isArray(unitResult.questions)
      ) {
        testData = unitResult;
      }
    }

    if (!testData) {
      return res.status(404).json({
        success: false,
        message:
          "Test data not found. You may be logged in with a different account than the one that took this test.",
      });
    }

    // Filter questions by section
    const sectionQuestions = testData.questions.filter(
      (q: any) => q.section_code === sectionCode,
    );

    // Map user answers to section question indices and add original index to each question
    const sectionUserAnswers: { [key: number]: string } = {};
    const questionsWithOriginalIndex: any[] = [];
    let sectionQuestionIndex = 0;

    testData.questions.forEach((q: any, idx: number) => {
      if (q.section_code === sectionCode) {
        sectionUserAnswers[sectionQuestionIndex] = testData.userAnswers[idx];
        questionsWithOriginalIndex.push({
          ...q,
          originalTestIndex: idx, // Add original position in full test
        });
        sectionQuestionIndex++;
      }
    });

    // Use centralized section lookup
    const { getSectionByCode, getApiCodeForSubject } =
      await import("../../../../../../../../server/subjects-helper");
    const apiCode = getApiCodeForSubject(subjectId as string);
    const sectionInfo = getSectionByCode(
      apiCode || (subjectId as string),
      sectionCode as string,
    );
    const info = sectionInfo || {
      title: sectionCode as string,
      description: "Unknown section",
    };
    // For "all" section, return entire test
    if (sectionCode === "all") {
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
      sectionName: info.title,
      sectionDescription: info.description,
    };
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
