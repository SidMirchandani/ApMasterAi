
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

    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const choicesText = choices.map((choice: string, i: number) => 
      `${String.fromCharCode(65 + i)}. ${choice}`
    ).join("\n");

    const correctAnswer = choices[correctAnswerIndex];
    const correctLabel = String.fromCharCode(65 + correctAnswerIndex);

    const prompt = `You are an expert AP tutor. Provide a concise explanation (100-150 words max) without numbered sections:

**Concept**: Briefly explain what this question tests (1-2 sentences).

**Why ${correctLabel} is correct**: Explain why this answer is right. Include the key formula and any calculations if applicable, then state the conclusion (e.g. "Therefore, ...").

**Why other choices are wrong**: Give a bulleted list with one bullet per incorrect choice. Each bullet must start with the letter and "is incorrect because" (e.g. "A is incorrect because ...", "B is incorrect because ..."). Use markdown bullets: start each line with "- ".

Be clear, concise, and student-friendly.

For math and equations use LaTeX inside single dollar signs, e.g. $P(t) = 1200 - 1000e^{-0.16t}$ or $\\frac{dP}{dt}$. Do not use backticks for math.

Question: ${questionPrompt}

Choices:
${choicesText}

Correct Answer: ${correctLabel}. ${correctAnswer}

Your explanation:`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const explanation = result.text?.trim() || "Unable to generate explanation at this time.";

    return res.status(200).json({ explanation });
  } catch (error: any) {
    console.error("Error generating explanation:", error);
    return res.status(500).json({
      error: "Failed to generate explanation",
      message: error.message,
    });
  }
}
