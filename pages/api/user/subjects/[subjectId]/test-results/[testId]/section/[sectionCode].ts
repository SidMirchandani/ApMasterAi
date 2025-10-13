import { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../../../../server/firebase-admin";
import { storage } from "../../../../../../../server/storage";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyAuthToken(token);
    const userId = decodedToken.uid;

    const { subjectId, testId, sectionCode } = req.query;

    if (!subjectId || !testId || !sectionCode) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const db = admin.firestore();

    // Fetch the full test result
    const testDoc = await db
      .collection("users")
      .doc(userId)
      .collection("subjects")
      .doc(subjectId as string)
      .collection("fullLengthTests")
      .doc(testId as string)
      .get();

    if (!testDoc.exists) {
      return res.status(404).json({ error: "Test not found" });
    }

    const testData = testDoc.data();

    // Filter questions and answers for the specific section
    const sectionQuestions = testData?.questions?.filter(
      (q: any) => q.section_code === sectionCode
    ) || [];

    // Filter user answers for this section's questions
    const sectionAnswers: { [key: number]: string } = {};
    testData?.questions?.forEach((q: any, idx: number) => {
      if (q.section_code === sectionCode && testData.userAnswers?.[idx]) {
        sectionAnswers[idx] = testData.userAnswers[idx];
      }
    });

    // Get section metadata from sectionBreakdown
    const sectionMetadata = testData?.sectionBreakdown?.[sectionCode as string];

    res.status(200).json({
      success: true,
      data: {
        questions: sectionQuestions,
        userAnswers: sectionAnswers,
        unitNumber: sectionMetadata?.unitNumber,
        sectionName: sectionMetadata?.name,
        score: sectionMetadata?.correct,
        totalQuestions: sectionMetadata?.total,
      },
    });
  } catch (error) {
    console.error("Error fetching section review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}