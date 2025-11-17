
import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../server/db";

// Exam weight distribution for different subjects
const EXAM_WEIGHTS: Record<string, Record<string, number>> = {
  "APMACRO": {
    "BEC": 5,      // Basic Economic Concepts: 5-10%
    "EIBC": 12,    // Economic Indicators & Business Cycle: 12-17%
    "NIPD": 17,    // National Income & Price Determination: 17-27%
    "FS": 18,      // Financial Sector: 18-23%
    "LRCSP": 20,   // Long-Run Consequences: 20-30%
    "OEITF": 10,   // Open Economy: 10-13%
  },
  "APCSP": {
    "CRD": 11.5,   // Creative Development: 10-13%
    "DAT": 19.5,   // Data: 17-22%
    "AAP": 32.5,   // Algorithms and Programming: 30-35%
    "CSN": 13,     // Computer Systems and Networks: 11-15%
    "IOC": 23.5,   // Impact of Computing: 21-26%
  },
  // Add other subjects as needed
};

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
    
    // For full-length tests without a section, use proportional distribution
    if (!section && EXAM_WEIGHTS[subject as string]) {
      const weights = EXAM_WEIGHTS[subject as string];
      const questionsRef = db.collection('questions');
      const selectedQuestions: any[] = [];
      
      console.log("🔍 Fetching proportional questions for full-length test:", {
        subject,
        totalQuestions: questionLimit,
        weights
      });
      
      // Calculate questions per section based on weights
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      const sectionEntries = Object.entries(weights);
      let remainingQuestions = questionLimit;
      
      for (let i = 0; i < sectionEntries.length; i++) {
        const [sectionCode, weight] = sectionEntries[i];
        
        // For the last section, use all remaining questions to ensure we hit exactly the limit
        const sectionQuestionCount = i === sectionEntries.length - 1 
          ? remainingQuestions 
          : Math.round((weight / totalWeight) * questionLimit);
        
        if (sectionQuestionCount > 0) {
          const sectionSnapshot = await questionsRef
            .where('subject_code', '==', subject as string)
            .where('section_code', '==', sectionCode)
            .limit(sectionQuestionCount * 3) // Fetch extra for randomization
            .get();
          
          const sectionQuestions = sectionSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Shuffle and select the needed amount
          const shuffled = sectionQuestions.sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, sectionQuestionCount);
          selectedQuestions.push(...selected);
          remainingQuestions -= selected.length;
          
          console.log(`  📊 ${sectionCode}: ${selected.length} questions (${weight}% weight)`);
        }
      }
      
      // Final shuffle of all selected questions
      const finalQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
      
      console.log("✅ Returning proportional questions:", {
        requested: questionLimit,
        returning: finalQuestions.length,
        breakdown: Object.entries(weights).map(([section, weight]) => ({
          section,
          count: finalQuestions.filter(q => q.section_code === section).length,
          weight: `${weight}%`
        }))
      });
      
      return res.status(200).json({
        success: true,
        data: finalQuestions,
      });
    }
    
    // Regular query logic for unit quizzes or subjects without weight config
    const fetchLimit = questionLimit * 4;

    console.log("🔍 Querying questions with:", {
      subject,
      section: section || "ALL",
      requestedLimit: questionLimit,
      fetchLimit
    });

    const questionsRef = db.collection('questions');
    let query = questionsRef.where('subject_code', '==', subject as string);
    
    if (section) {
      console.log("📍 Adding section filter:", section);
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

    // If no results and section was specified, log sample documents for debugging
    if (snapshot.empty && section) {
      console.log("❌ No questions found with filters - fetching sample docs for debugging");
      const sampleQuery = await questionsRef
        .where('subject_code', '==', subject as string)
        .limit(5)
        .get();
      
      const samples = sampleQuery.docs.map(doc => ({
        id: doc.id,
        subject_code: doc.data().subject_code,
        section_code: doc.data().section_code
      }));
      console.log("📋 Sample questions for subject:", samples);
    }

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

    const allQuestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
