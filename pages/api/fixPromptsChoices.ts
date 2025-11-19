
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
    console.log(`Fixing prompts and choices for ${total} selected questions...`);

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
          `Fixing prompts/choices for Question ${i + 1}/${total} (ID: ${questionId})`,
        );

        // Build prompt for fixing
        let promptText = `Fix ONLY formatting issues in this AP question text. DO NOT change any words or add new content.

Only fix:
- Math notation (exponents, subscripts, superscripts)
- Chemical formulas and symbols
- Special characters and symbols
- Spacing around operators and punctuation

DO NOT:
- Change any words
- Add explanatory text
- Rephrase anything
- Fix "typos" or "grammar"
- Add context

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

        promptText += "\n\nReturn the text with ONLY formatting fixes in this exact JSON format:\n";
        promptText += `{
  "question": "formatting-fixed question text",
  "choices": {
    "A": "formatting-fixed choice A",
    "B": "formatting-fixed choice B",
    "C": "formatting-fixed choice C",
    "D": "formatting-fixed choice D",
    "E": "formatting-fixed choice E"
  }
}

Remember: Only fix formatting (math notation, symbols, spacing). Keep all words exactly the same.`;

        const modelInstance = genAI.getGenerativeModel({ model: selectedModel });
        const result = await modelInstance.generateContent(promptText);

        let responseText = result.response?.text()?.trim() || "";
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const corrected = JSON.parse(responseText);

        // Update prompt_blocks with corrected text
        const updatedPromptBlocks = question.prompt_blocks?.map((block: any) => {
          if (block.type === "text") {
            return { ...block, value: corrected.question };
          }
          return block;
        }) || [{ type: "text", value: corrected.question }];

        // Update choice blocks with corrected text
        const updatedChoices: any = {};
        for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
          updatedChoices[letter] = (blocks as any[]).map((block: any) => {
            if (block.type === "text") {
              return { ...block, value: corrected.choices[letter] || block.value };
            }
            return block;
          });
        }

        await doc.ref.update({
          prompt_blocks: updatedPromptBlocks,
          choices: updatedChoices,
          updatedAt: new Date(),
        });

        updated++;
        console.log(`✓ Fixed prompts/choices for question ${doc.id}`);
      } catch (error) {
        console.error(
          `✗ Failed to fix prompts/choices for ${questionId}:`,
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
    console.error("Error fixing prompts/choices:", error);
    return res.status(500).json({
      error: "Failed to fix prompts/choices",
      message: error.message,
    });
  }
}
