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

    // ✅ 3. Fetch all questions (we’ll rewrite explanations for all)
    console.log("Fetching all questions from Firestore...");
    const snapshot = await questionsRef.get();
    const total = snapshot.size;
    console.log(`Found ${total} total questions`);

    let updated = 0;

    // ✅ 4. Generate explanations for all questions (throttled)
    for (let i = 0; i < snapshot.docs.length; i++) {
      const doc = snapshot.docs[i];
      const question = doc.data();

      console.log(`Generating explanation for Question ${i + 1}/${total}`);

      try {
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
        console.error(`✗ Failed to generate explanation for ${doc.id}:`, error);
      }

      // ⏱️ 1-second delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Completed: Regenerated ${updated} explanations`);

    return res.status(200).json({
      total,
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
