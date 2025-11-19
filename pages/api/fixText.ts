import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirebaseAdmin } from "../../server/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { questionIds } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    // Initialize Gemini with correct v1 SDK
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Initialize Firebase Admin
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const questionsRef = firestore.collection("questions");

    const total = questionIds.length;
    console.log(`Fixing text for ${total} selected questions...`);

    let updated = 0;

    // Fix text for selected questions (throttled)
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];

      try {
        const doc = await questionsRef.doc(questionId).get();

        if (!doc.exists) {
          console.log(`Question ${questionId} not found, skipping...`);
          continue;
        }

        const question = doc.data();

        console.log(
          `Fixing text for Question ${i + 1}/${total} (ID: ${questionId})`,
        );

        // Build prompt for text cleanup
        const promptText = `Fix any formatting or OCR errors in this text. Return ONLY the corrected text, nothing else:\n\n${question.prompt || ""}`;

        // Use correct v1 SDK pattern
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent(promptText);

        const fixedText = result.response?.text()?.trim() || "";

        // Update question
        await doc.ref.update({
          prompt: fixedText,
          updatedAt: new Date(),
        });

        updated++;
        console.log(`✓ Fixed text for question ${doc.id}`);
      } catch (error) {
        console.error(
          `✗ Failed to fix text for ${questionId}:`,
          error,
        );
      }

      // Delay 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Completed: Fixed ${updated}/${total} questions`);

    return res.status(200).json({
      total,
      updated,
    });
  } catch (error: any) {
    console.error("Error fixing text:", error);
    return res.status(500).json({
      error: "Failed to fix text",
      message: error.message,
    });
  }
}