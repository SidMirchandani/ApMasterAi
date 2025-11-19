
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName } from "../../lib/gemini-models";

function flattenChoiceText(blocks: any[]) {
  return blocks
    .filter(b => b.type === "text")
    .map(b => b.value)
    .join(" ");
}

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { questionIds, model = "1.5" } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    // Get the full model name using the helper function
    const selectedModel = getModelName(model);
    
    console.log(`Using model: ${selectedModel} (from selection: ${model})`);

    // Initialize Gemini with correct SDK
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
    console.log(`Generating explanations for ${total} selected questions...`);

    let updated = 0;

    // Generate explanations for selected questions (throttled)
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];

      try {
        const doc = await questionsRef.doc(questionId).get();

        if (!doc.exists) {
          console.log(`Question ${questionId} not found, skipping...`);
          continue;
        }

        const question = doc.data();
        
        // Skip if explanation already exists and is not empty
        if (question.explanation && question.explanation.trim() !== '') {
          console.log(
            `Skipping Question ${i + 1}/${total} (ID: ${questionId}) - explanation already exists`,
          );
          continue;
        }

        console.log(
          `Generating explanation for Question ${i + 1}/${total} (ID: ${questionId})`,
        );

        // Build comprehensive prompt with images
        const promptParts: any[] = [];
        
        let promptText = `You are an expert AP tutor. Generate a clear, structured explanation for this AP question.\n\n`;
        
        // Add question text
        if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
          const questionText = flattenChoiceText(question.prompt_blocks);
          promptText += `Question: ${questionText}\n`;
        }
        
        promptParts.push({ text: promptText });
        
        // Add question images (fetch and convert to base64)
        if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
          for (const block of question.prompt_blocks) {
            if (block.type === "image" && block.url) {
              try {
                const base64Data = await fetchImageAsBase64(block.url);
                promptParts.push({
                  inlineData: {
                    mimeType: "image/png",
                    data: base64Data
                  }
                });
              } catch (err) {
                console.error(`Failed to fetch image ${block.url}:`, err);
              }
            }
          }
        }
        
        // Add choices with their images
        let choicesText = `\nAnswer Choices:\n`;
        Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
          const choiceText = flattenChoiceText(blocks);
          choicesText += `${letter}. ${choiceText}\n`;
        });
        
        const correctLabel = String.fromCharCode(65 + question.answerIndex);
        const correctAnswerBlocks = question.choices?.[correctLabel];
        const correctAnswer = correctAnswerBlocks ? flattenChoiceText(correctAnswerBlocks) : "";
        choicesText += `\nCorrect Answer: ${correctLabel}. ${correctAnswer}\n\n`;
        
        promptParts.push({ text: choicesText });
        
        // Add choice images (fetch and convert to base64)
        for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
          for (const block of blocks as any[]) {
            if (block.type === "image" && block.url) {
              try {
                const base64Data = await fetchImageAsBase64(block.url);
                promptParts.push({
                  inlineData: {
                    mimeType: "image/png",
                    data: base64Data
                  }
                });
              } catch (err) {
                console.error(`Failed to fetch choice image ${block.url}:`, err);
              }
            }
          }
        }
        
        // Add structured explanation requirements
        promptParts.push({
          text: `\nYour explanation MUST follow this exact structure:

1. **Briefly explain the underlying concept being tested (2-4 sentences).**
2. **Explain clearly why ${correctLabel} is the correct answer.**
3. **Explain why each incorrect answer choice is wrong (A, B, C, D, E - except ${correctLabel}).**

Keep your explanation clear, concise, and student-friendly. Use complete sentences.

Your explanation:`
        });

        // Use correct v1 SDK pattern
        const modelInstance = genAI.getGenerativeModel({ model: selectedModel });
        const result = await modelInstance.generateContent(promptParts);

        let explanation = result.response?.text()?.trim() || "";
        explanation = explanation.replace(/^Explanation:\s*/i, "").trim();

        // Always overwrite explanation
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

      // Delay 1 second between requests
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
