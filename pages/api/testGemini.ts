import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client
// It will automatically look for the GEMINI_API_KEY in environment variables
const ai = new GoogleGenAI({}); 

export default async function handler(req, res) {
  try {
    // 1. Check for the API key availability
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Throwing an error here ensures the function stops if the key is missing
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    // 2. Use the correct, available model: 'gemini-2.5-flash'
    const response = await ai.models.generateContent({
      // ✅ FIX: Changed to the available model from your list
      model: "gemini-2.5-flash", 

      // Simpler contents array (the SDK can often handle a simplified structure)
      contents: "Say hello from Gemini 2.5 Flash!",
    });

    // 3. Extract and return the text
    // The SDK response object has a .text property for the generated text
    res.status(200).json({ text: response.text });

  } catch (err) {
    console.error("Gemini API Error:", err);
    // Return a structured 500 error response
    res.status(500).json({ 
      error: "Failed to generate content", 
      details: err.message 
    });
  }
}