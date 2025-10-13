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

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    // ✅ 1. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // ✅ 2. Initialize Firebase Admin
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const questionsRef = firestore.collection("questions");

    const total = questionIds.length;
    console.log(`Generating explanations for ${total} selected questions...`);

    let updated = 0;

    // ✅ 3. Generate explanations for selected questions (throttled)
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];

      try {
        const doc = await questionsRef.doc(questionId).get();

        if (!doc.exists) {
          console.log(`Question ${questionId} not found, skipping...`);
          continue;
        }

        const question = doc.data();

        console.log(`Generating explanation for Question ${i + 1}/${total} (ID: ${questionId})`);

        const prompt = `Explain why the correct answer is correct for the following AP-style multiple-choice question.
Question: ${question.prompt}
Choices: ${question.choices?.join(", ")}
Correct answer: ${question.choices?.[question.answerIndex]}
Keep your explanation concise (2–3 sentences).`;

        const result = await model.generateContent(prompt);
        let explanation = result.response.text()?.trim() || "";

        // Clean formatting
        explanation = explanation.replace(/^Explanation:\s*/i, "").trim();

        // ✅ Always overwrite
        await doc.ref.update({
          explanation,
          updatedAt: new Date(),
        });

        updated++;
        console.log(`✓ Overwrote explanation for question ${doc.id}`);
      } catch (error) {
        console.error(`✗ Failed to generate explanation for ${questionId}:`, error);
      }

      // ⏱️ 1-second delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Completed: Regenerated ${updated} explanations for selected questions`);

    return res.status(200).json({
      total: questionIds.length,
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