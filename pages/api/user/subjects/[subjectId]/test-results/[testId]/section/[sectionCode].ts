
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

    const sectionData = await storage.getSectionReviewData(userId, subjectId, testId, sectionCode);

    if (!sectionData) {
      return res.status(404).json({
        success: false,
        message: "Section data not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: sectionData,
    });
  } catch (error) {
    console.error("[section-review API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
import { NextApiRequest, NextApiResponse } from "next";
import admin from "@/server/firebase-admin";
import { verifyAuthToken } from "@/server/firebase-admin";

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
