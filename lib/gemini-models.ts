/**
 * Returns Gemini API client options. Uses GEMINI_API_KEY when set (direct Google API);
 * otherwise falls back to AI_INTEGRATIONS_* (e.g. Replit/modelfarm).
 */
export function getGeminiClientOptions(): {
  apiKey: string;
  httpOptions?: { apiVersion?: string; baseUrl?: string };
} {
  const directKey = process.env.GEMINI_API_KEY?.trim();
  if (directKey) {
    return { apiKey: directKey };
  }
  return {
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  };
}

/**
 * Helper function to get the correct Gemini model name based on user selection
 * @param userModelSelection - User's model selection ("2.5", "2.5pro")
 * @returns Full model name for the Gemini API
 */
export function getModelName(userModelSelection: string): string {
  const modelMap: Record<string, string> = {
    "2.5": "gemini-2.5-flash",
    "2.5pro": "gemini-2.5-pro",
  };

  return modelMap[userModelSelection] || "gemini-2.5-flash";
}

/**
 * Valid model selection values
 */
export const VALID_MODEL_SELECTIONS = ["2.5", "2.5pro"] as const;

export type ModelSelection = typeof VALID_MODEL_SELECTIONS[number];
