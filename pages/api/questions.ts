
import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subject, section, limit } = req.query;

  if (!subject || !section) {
    return res.status(400).json({
      success: false,
      message: "Subject and section are required",
    });
  }

  try {
    const db = getDb();
    const questionLimit = limit ? parseInt(limit as string) : 25;

    // Query Firestore for MCQ questions
    const questionsRef = db.collection('mcqQuestions');
    const snapshot = await questionsRef
      .where('subjectCode', '==', subject as string)
      .where('sectionCode', '==', section as string)
      .limit(questionLimit * 2) // Get more than needed for randomization
      .get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Convert to array and shuffle
    const allQuestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Shuffle and limit
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, questionLimit);

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
