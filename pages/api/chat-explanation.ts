
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
      explanation,
      correctAnswer,
      choices,
      userQuestion,
      conversationHistory,
    } = req.body;

    if (!userQuestion) {
      return res.status(400).json({ error: "User question is required" });
    }

    const opts = getGeminiClientOptions();
    const ai = new GoogleGenAI({
      apiKey: opts.apiKey,
      ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
    });

    const conversationContext = conversationHistory
      ?.map((msg: { role: string; content: string }) => 
        `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`
      )
      .join("\n\n") || "";

    const prompt = `You are an expert AP tutor helping a student understand a question they got wrong or want more clarity on.

Question: ${questionPrompt}

Answer Choices:
${choices?.map((choice: string, i: number) => `${String.fromCharCode(65 + i)}. ${choice}`).join("\n")}

Correct Answer: ${correctAnswer}

Original Explanation: ${explanation}

${conversationContext ? `Previous Conversation:\n${conversationContext}\n\n` : ""}

Student's Follow-up Question: ${userQuestion}

Provide a clear, concise, and helpful response to the student's question. Focus on:
1. Directly answering their specific question
2. Building on the original explanation when relevant
3. Using simple language and examples
4. Being encouraging and supportive

Your response:`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const aiResponse = result.text?.trim() || "I'm sorry, I couldn't generate a response. Please try rephrasing your question.";

    return res.status(200).json({ response: aiResponse });
  } catch (error: any) {
    console.error("Error in chat explanation:", error);
    return res.status(500).json({
      error: "Failed to get AI response",
      message: error.message,
    });
  }
}
