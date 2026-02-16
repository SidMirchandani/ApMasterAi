
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
