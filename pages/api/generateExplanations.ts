
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirebaseAdmin } from "../../server/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Get Firebase Admin
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const questionsRef = firestore.collection("questions");

    // Fetch all questions
    console.log("Fetching questions from Firestore...");
    const snapshot = await questionsRef.get();
    const total = snapshot.size;
    console.log(`Found ${total} total questions`);

    // Filter questions without explanations
    const questionsNeedingExplanations = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.explanation || data.explanation.trim() === "";
    });

    console.log(
      `Found ${questionsNeedingExplanations.length} questions needing explanations`
    );

    let updated = 0;

    // Generate explanations
    for (let i = 0; i < questionsNeedingExplanations.length; i++) {
      const doc = questionsNeedingExplanations[i];
      const question = doc.data();

      console.log(
        `Generating explanation for Question ${i + 1}/${questionsNeedingExplanations.length}`
      );

      try {
        const prompt = `Explain why the correct answer is correct for the following AP-style multiple-choice question.
Question: ${question.prompt}
Choices: ${question.choices.join(", ")}
Correct answer: ${question.choices[question.answerIndex]}
Keep your explanation concise (2–3 sentences).`;

        const result = await model.generateContent(prompt);
        const explanation = result.response.text();

        // Save to Firestore
        await doc.ref.update({
          explanation: explanation.trim(),
          updatedAt: new Date(),
        });

        updated++;
        console.log(
          `✓ Generated and saved explanation for question ${doc.id}`
        );
      } catch (error) {
        console.error(`✗ Failed to generate explanation for ${doc.id}:`, error);
        // Continue with next question even if one fails
      }
    }

    console.log(`Completed: Generated ${updated} new explanations`);

    return res.status(200).json({
      total: questionsNeedingExplanations.length,
      updated,
    });
  } catch (error: any) {
    console.error("Error generating explanations:", error);
    return res.status(500).json({
      error: "Failed to generate explanations",
      message: error.message,
    });
  }
}
