
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

  if (!subject) {
    return res.status(400).json({
      success: false,
      message: "Subject is required",
    });
  }

  try {
    const db = getDb();
    const questionLimit = limit ? parseInt(limit as string) : 25;
    // Fetch more than needed for better randomization
    const fetchLimit = questionLimit * 4;

    console.log("🔍 Querying questions with:", {
      subject,
      section: section || "ALL",
      requestedLimit: questionLimit,
      fetchLimit
    });

    // Query Firestore for MCQ questions
    const questionsRef = db.collection('questions');
    let query = questionsRef.where('subject_code', '==', subject as string);
    
    // Only filter by section if provided (for unit quizzes)
    if (section) {
      query = query.where('section_code', '==', section as string);
    }
    
    const snapshot = await query
      .limit(fetchLimit)
      .get();

    console.log("📊 Firestore query result:", {
      isEmpty: snapshot.empty,
      size: snapshot.size,
      queriedFor: { subject, section: section || "ALL" }
    });

    // If empty, let's check what data exists in the collection
    if (snapshot.empty) {
      const sampleSnapshot = await questionsRef.limit(3).get();
      const sampleDocs = sampleSnapshot.docs.map(doc => ({
        id: doc.id,
        subject_code: doc.data().subject_code,
        section_code: doc.data().section_code
      }));
      console.log("📋 Sample documents in questions collection:", sampleDocs);
    }

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

    console.log("✅ Returning questions:", {
      totalFound: allQuestions.length,
      returning: questions.length,
      firstQuestionId: questions[0]?.id,
      firstQuestionSubject: questions[0]?.subject_code,
      firstQuestionSection: questions[0]?.section_code
    });

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
