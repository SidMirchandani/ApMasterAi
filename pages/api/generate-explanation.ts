
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      questionPrompt,
      choices,
      correctAnswerIndex,
    } = req.body;

    if (!questionPrompt || !choices || correctAnswerIndex === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const ai = new GoogleGenAI({ apiKey });

    const choicesText = choices.map((choice: string, i: number) => 
      `${String.fromCharCode(65 + i)}. ${choice}`
    ).join("\n");

    const correctAnswer = choices[correctAnswerIndex];
    const correctLabel = String.fromCharCode(65 + correctAnswerIndex);

    const prompt = `You are an expert AP tutor. Generate a clear, educational explanation for this AP question.

Question: ${questionPrompt}

Answer Choices:
${choicesText}

Correct Answer: ${correctLabel}. ${correctAnswer}

Provide a comprehensive explanation that:
1. Explains why the correct answer (${correctLabel}) is right
2. Explains why each of the other answer choices is wrong
3. Uses clear, student-friendly language
4. Includes relevant AP exam concepts and reasoning

Format your explanation with clear sections for the correct answer and wrong answers.

Your explanation:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const explanation = response.text?.trim() || "Unable to generate explanation at this time.";

    return res.status(200).json({ explanation });
  } catch (error: any) {
    console.error("Error generating explanation:", error);
    return res.status(500).json({
      error: "Failed to generate explanation",
      message: error.message,
    });
  }
}
