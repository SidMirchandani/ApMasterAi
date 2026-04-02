
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getGeminiClientOptions } from "../../lib/gemini-models";
import { requireUser } from "../../server/next-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const {
      questionPrompt,
      choices,
      correctAnswerIndex,
    } = req.body;

    if (!questionPrompt || !choices || correctAnswerIndex === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const opts = getGeminiClientOptions();
    const ai = new GoogleGenAI({
      apiKey: opts.apiKey,
      ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
    });

    const choicesText = choices.map((choice: string, i: number) => 
      `${String.fromCharCode(65 + i)}. ${choice}`
    ).join("\n");

    const correctAnswer = choices[correctAnswerIndex];
    const correctLabel = String.fromCharCode(65 + correctAnswerIndex);

    const prompt = `You are an expert AP Exam Tutor. Your task is to generate explanations for AP multiple-choice questions.

Your explanations must be highly scannable, focus heavily on the core concept, and provide actionable test-taking strategies. You must strictly follow the structure below. Do not deviate from the headings provided.

**Concept:**
Provide a brief, 1-2 sentence reminder of the overarching concept being tested. Keep it high-level and tied to the AP course/topic, not the specific answer choices.

**Why ${correctLabel} is correct:**
Provide a concise, 1-3 sentence explanation of exactly why this choice is the correct answer. You MUST explicitly reference the actual text of the correct choice from the prompt (for example, "Choice ${correctLabel}, ..."). Spend the bulk of your analytical effort here, using key numbers, conditions, or phrases from the question stem as evidence.

[OPTIONAL SECTION — ONLY INCLUDE IF IT TRULY ADDS VALUE. IF SKIPPING, DO NOT PRINT THIS HEADING OR ANY TEXT FOR THIS SECTION.]
**Common Misconception:**
ONLY include this section if there is ONE highly tempting wrong answer that represents a frequent student error. Explicitly name the choice (for example, "Choice A is incorrect because..."). In 1-2 sentences, explain why it is a trap or how it misreads the concept. Do NOT analyze every incorrect choice and do NOT list multiple distractors here.

**Coaching for students:**
*Provide a 1-2 sentence meta-cognitive test-taking tip in italics. Tell the student how to spot the "trick" in similar questions, how to approach the phrasing, or what specific keywords to watch for next time. Do not introduce new content beyond what is needed for the test-taking tip.*

Keep the ENTIRE explanation to about 100-150 words. Be clear, concise, and student-friendly.

For math and equations use LaTeX inside single dollar signs, e.g. $P(t) = 1200 - 1000e^{-0.16t}$ or $\\frac{dP}{dt}$. Do not use backticks for math.

Question: ${questionPrompt}

Choices:
${choicesText}

Correct Answer: ${correctLabel}. ${correctAnswer}

Your explanation:`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
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
