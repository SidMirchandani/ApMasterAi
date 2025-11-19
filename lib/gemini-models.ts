
/**
 * Helper function to get the correct Gemini model name based on user selection
 * @param userModelSelection - User's model selection ("2.0", "2.5")
 * @returns Full model name for the Gemini API (v1 only - Flash models)
 */
export function getModelName(userModelSelection: string): string {
  const modelMap: Record<string, string> = {
    "2.0": "gemini-2.0-flash",
    "2.5": "gemini-2.5-flash",
  };

  // Default to 2.0 Flash if invalid selection
  return modelMap[userModelSelection] || "gemini-2.0-flash";
}

/**
 * Valid model selection values
 */
export const VALID_MODEL_SELECTIONS = ["2.0", "2.5"] as const;

export type ModelSelection = typeof VALID_MODEL_SELECTIONS[number];
