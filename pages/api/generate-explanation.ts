import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const genAI = new GoogleGenerativeAI(apiKey);

    const choicesText = choices.map((choice: string, i: number) => 
      `${String.fromCharCode(65 + i)}. ${choice}`
    ).join("\n");

    const correctAnswer = choices[correctAnswerIndex];
    const correctLabel = String.fromCharCode(65 + correctAnswerIndex);

    const prompt = `You are an expert AP tutor. Provide a concise explanation (100-150 words max) without numbered sections:

**Concept**: Briefly explain what this question tests (1-2 sentences).

**Why ${String.fromCharCode(65 + correctAnswerIndex)} is correct**: Explain why this answer is right.

**Why other choices are wrong**: Briefly explain why each incorrect answer is wrong.

Be clear, concise, and student-friendly.

Your explanation:`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);

    const explanation = result.response?.text()?.trim() || "Unable to generate explanation at this time.";

    return res.status(200).json({ explanation });
  } catch (error: any) {
    console.error("Error generating explanation:", error);
    return res.status(500).json({
      error: "Failed to generate explanation",
      message: error.message,
    });
  }
}