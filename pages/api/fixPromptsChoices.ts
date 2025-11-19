
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

function deduplicateTextContent(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  // Split by sentences (periods, question marks, exclamation marks)
  const sentences = text.split(/([.!?]+\s+)/).filter(s => s.trim());
  const seen = new Set<string>();
  const uniqueSentences: string[] = [];
  
  for (const sentence of sentences) {
    const normalized = sentence.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      uniqueSentences.push(sentence);
    }
  }
  
  return uniqueSentences.join('');
}

function removeDuplicateBlocks(blocks: any[]): any[] {
  if (!blocks || blocks.length === 0) return blocks;
  
  const seen = new Set<string>();
  const uniqueBlocks: any[] = [];
  
  for (const block of blocks) {
    let key: string;
    if (block.type === "text") {
      // Deduplicate text content within the block
      const deduplicatedText = deduplicateTextContent(block.value);
      key = `text:${deduplicatedText}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push({ ...block, value: deduplicatedText });
      }
    } else if (block.type === "image") {
      key = `image:${block.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      }
    } else {
      key = JSON.stringify(block);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      }
    }
  }
  
  return uniqueBlocks;
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

        // Skip if already fixed
        if (question.tags && question.tags.includes("prompt_fixed")) {
          console.log(`Question ${questionId} already fixed, skipping...`);
          continue;
        }

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

        // Remove duplicates from prompt blocks
        const deduplicatedPromptBlocks = removeDuplicateBlocks(updatedPromptBlocks);

        // Update choice blocks with corrected text
        const updatedChoices: any = {};
        for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
          const correctedBlocks = (blocks as any[]).map((block: any) => {
            if (block.type === "text") {
              return { ...block, value: corrected.choices[letter] || block.value };
            }
            return block;
          });
          // Remove duplicates from choice blocks
          updatedChoices[letter] = removeDuplicateBlocks(correctedBlocks);
        }

        // Add "prompt_fixed" tag
        const existingTags = question.tags || [];
        const updatedTags = existingTags.includes("prompt_fixed") 
          ? existingTags 
          : [...existingTags, "prompt_fixed"];

        await doc.ref.update({
          prompt_blocks: deduplicatedPromptBlocks,
          choices: updatedChoices,
          tags: updatedTags,
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
