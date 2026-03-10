
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: "Say hello from Gemini 2.5 Flash Lite!",
    });

    const text = result.text || "";
    res.status(200).json({ text });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ 
      error: "Failed to generate content", 
      details: err.message 
    });
  }
}
