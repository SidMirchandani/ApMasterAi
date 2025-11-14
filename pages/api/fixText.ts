
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
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

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const ai = new GoogleGenAI({ apiKey });

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

        // Prompt to fix text formatting issues
        const prompt = `
Fix any text formatting issues in the following AP-style multiple-choice question.
Ensure proper capitalization, punctuation, and remove any extraneous characters or formatting artifacts.
Keep the meaning exactly the same, only fix formatting.

Question: ${question.prompt}
Choices: ${question.choices?.join(" | ")}
Explanation: ${question.explanation || ""}

Return the fixed text in this exact format:
QUESTION: [fixed question text]
CHOICES: [choice A] | [choice B] | [choice C] | [choice D] | [choice E]
EXPLANATION: [fixed explanation text]
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        let fixedText = response.text?.trim() || "";

        // Parse the response
        const questionMatch = fixedText.match(/QUESTION:\s*(.+?)(?=CHOICES:|$)/s);
        const choicesMatch = fixedText.match(/CHOICES:\s*(.+?)(?=EXPLANATION:|$)/s);
        const explanationMatch = fixedText.match(/EXPLANATION:\s*(.+?)$/s);

        const updates: any = {};

        if (questionMatch) {
          updates.prompt = questionMatch[1].trim();
        }

        if (choicesMatch) {
          const choicesText = choicesMatch[1].trim();
          updates.choices = choicesText.split("|").map((c) => c.trim()).filter(Boolean);
        }

        if (explanationMatch) {
          updates.explanation = explanationMatch[1].trim();
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await doc.ref.update(updates);
          updated++;
          console.log(`✓ Fixed text for question ${doc.id}`);
        } else {
          console.log(`No fixes needed for question ${doc.id}`);
        }
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
