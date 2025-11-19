
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    // Check for the API key availability
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    // Initialize with correct SDK
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get model instance
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Generate content
    const result = await model.generateContent("Say hello from Gemini 2.5 Flash!");

    // Extract and return the text
    const text = result.response?.text() || "";
    res.status(200).json({ text });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ 
      error: "Failed to generate content", 
      details: err.message 
    });
  }
}
