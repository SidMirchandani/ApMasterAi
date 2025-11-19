import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";

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
    const { questionIds, model = "gemini-2.5-flash" } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    // Validate model selection - using working model names from API
    const validModels = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro-latest"];
    const selectedModel = validModels.includes(model) ? model : "gemini-2.5-flash";
    
    console.log(`Using model: ${selectedModel}`);

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
        
        let promptText = `You are an expert AP tutor. Generate a SHORT, focused explanation for this AP question.\n\n`;
        
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
        
        promptParts.push({
          text: `\nProvide a CONCISE explanation that:\n1. Explains the concept being tested (1-2 sentences)\n2. Explains why ${correctLabel} is correct (1-2 sentences)\n3. Briefly explains why the other choices are wrong (1 sentence each)\n\nKeep it short and student-friendly.\n\nYour explanation:`
        });

        const prompt = promptParts;

        // ✅ Use selected model
        const response = await ai.models.generateContent({
          model: selectedModel,
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
