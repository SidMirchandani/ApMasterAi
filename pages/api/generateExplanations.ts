import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";

function flattenChoiceText(blocks: any[]) {
  return blocks
    .filter(b => b.type === "text")
    .map(b => b.value)
    .join(" ");
}

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

    // ✅ 1. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    // Use the verified working SDK
    const ai = new GoogleGenAI({ apiKey });

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
        console.log(
          `Generating explanation for Question ${i + 1}/${total} (ID: ${questionId})`,
        );

        // Build comprehensive prompt with images
        let promptText = `You are an expert AP tutor. Generate a clear, educational explanation for this AP question.\n\n`;
        
        // Add question text
        if (question.prompt) {
          promptText += `Question: ${question.prompt}\n`;
        }
        
        // Add question images if they exist
        if (question.image_urls?.question && Array.isArray(question.image_urls.question) && question.image_urls.question.length > 0) {
          promptText += `Question Image URLs:\n${question.image_urls.question.map((url: string, idx: number) => `  - Image ${idx + 1}: ${url}`).join('\n')}\n`;
        }
        
        // Add choices with their images
        promptText += `\nAnswer Choices:\n`;
        Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
          const choiceText = flattenChoiceText(blocks);
          promptText += `${letter}. ${choiceText}\n`;
          
          // Check for images in the blocks
          const imageBlocks = blocks.filter((b: any) => b.type === "image");
          if (imageBlocks.length > 0) {
            promptText += `   Choice ${letter} Image URLs:\n${imageBlocks.map((b: any, imgIdx: number) => `   - Image ${imgIdx + 1}: ${b.url}`).join('\n')}\n`;
          }
        });
        
        const correctLabel = String.fromCharCode(65 + question.answerIndex);
        const correctAnswerBlocks = question.choices?.[correctLabel];
        const correctAnswer = correctAnswerBlocks ? flattenChoiceText(correctAnswerBlocks) : "";
        promptText += `\nCorrect Answer: ${correctLabel}. ${correctAnswer}\n`;
        promptText += `\nProvide a comprehensive explanation that:\n`;
        promptText += `1. Explains the key concept or principle being tested\n`;
        promptText += `2. Explains why the correct answer (${correctLabel}) is right with specific reasoning\n`;
        promptText += `3. Explains why each of the other answer choices is wrong\n`;
        promptText += `4. Uses clear, student-friendly language appropriate for AP students\n`;
        promptText += `5. References any images when relevant to the explanation\n\n`;
        promptText += `Format your explanation with clear sections. Be thorough but concise.\n\n`;
        promptText += `Your explanation:`;

        const prompt = promptText;

        // ✅ Correct Gemini 2.5 Flash call
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        let explanation = response.text?.trim() || "";
        explanation = explanation.replace(/^Explanation:\s*/i, "").trim();

        // ✅ Always overwrite explanation
        await doc.ref.update({
          explanation,
          updatedAt: new Date(),
        });

        updated++;
        console.log(`✓ Overwrote explanation for question ${doc.id}`);
      } catch (error) {
        console.error(
          `✗ Failed to generate explanation for ${questionId}:`,
          error,
        );
      }

      // ⏱️ Delay 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Completed: Regenerated ${updated}/${total} explanations`);

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
