
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName } from "../../lib/gemini-models";
import { uploadImageToStorage } from "../../server/storage";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";

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
    const { questionIds, model = "2.0" } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    const selectedModel = getModelName(model);
    console.log(`Using model: ${selectedModel} (from selection: ${model})`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const questionsRef = firestore.collection("questions");

    const total = questionIds.length;
    console.log(`Generating context for ${total} selected questions...`);

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
          `Generating context for Question ${i + 1}/${total} (ID: ${questionId})`,
        );

        let promptText = `You are an AP exam question expert. Analyze this question and its answer choices. If the question appears to reference missing context (like a table, chart, graph, or passage that would normally accompany it), generate that contextual information.

Question:
`;
        
        if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
          const questionText = flattenChoiceText(question.prompt_blocks);
          promptText += questionText + "\n\n";
        }

        promptText += "Answer Choices:\n";
        Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
          const choiceText = flattenChoiceText(blocks);
          promptText += `${letter}. ${choiceText}\n`;
        });

        promptText += `\n\nIf this question needs additional context (table, data, passage, etc.), provide it. Return your response in this JSON format:
{
  "needsContext": true/false,
  "contextType": "text" or "table",
  "context": "the generated contextual information as formatted text or markdown table"
}

If no context is needed, set needsContext to false.`;

        const modelInstance = genAI.getGenerativeModel({ model: selectedModel });
        const result = await modelInstance.generateContent(promptText);

        let responseText = result.response?.text()?.trim() || "";
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const contextData = JSON.parse(responseText);

        if (contextData.needsContext && contextData.context) {
          // Add context as a text block at the beginning of prompt_blocks
          const contextBlock = {
            type: "text",
            value: `[Context]\n${contextData.context}\n\n`
          };

          const updatedPromptBlocks = [
            contextBlock,
            ...(question.prompt_blocks || [])
          ];

          await doc.ref.update({
            prompt_blocks: updatedPromptBlocks,
            updatedAt: new Date(),
          });

          updated++;
          console.log(`✓ Generated context for question ${doc.id}`);
        } else {
          console.log(`ℹ No context needed for question ${doc.id}`);
        }
      } catch (error) {
        console.error(
          `✗ Failed to generate context for ${questionId}:`,
          error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Completed: Generated context for ${updated}/${total} questions`);

    return res.status(200).json({
      total,
      updated,
    });
  } catch (error: any) {
    console.error("Error generating context:", error);
    return res.status(500).json({
      error: "Failed to generate context",
      message: error.message,
    });
  }
}
