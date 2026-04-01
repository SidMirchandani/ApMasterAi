
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getGeminiClientOptions } from "../../lib/gemini-models";
import { requireAdmin } from "../../server/next-api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const opts = getGeminiClientOptions();
    const ai = new GoogleGenAI({
      apiKey: opts.apiKey,
      ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: "Say hello from Gemini 2.5 Flash Lite!",
    });

    const text = result.text || "";
    res.status(200).json({ text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({
      error: "Failed to generate content",
      details: err?.message || String(err),
    });
  }
}
