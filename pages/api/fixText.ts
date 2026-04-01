import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { requireAdmin } from "../../server/next-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { questionIds } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const questionsRef = firestore.collection("questions");

    const total = questionIds.length;
    console.log(`Fixing text for ${total} selected questions...`);

    let updated = 0;

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

        const promptText = `Fix any formatting or OCR errors in this text. Return ONLY the corrected text, nothing else:\n\n${question.prompt || ""}`;

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: promptText,
        });

        const fixedText = result.text?.trim() || "";

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