
/**
 * Helper function to get the correct Gemini model name based on user selection
 * @param userModelSelection - User's model selection ("1.5", "2.0", "2.5")
 * @returns Full model name for the Gemini API
 */
export function getModelName(userModelSelection: string): string {
  const modelMap: Record<string, string> = {
    "1.5": "gemini-1.5-flash-latest",
    "2.0": "gemini-2.0-flash",
    "2.5": "gemini-2.5-flash",
  };

  return modelMap[userModelSelection] || "gemini-1.5-flash-latest";
}

/**
 * Valid model selection values
 */
export const VALID_MODEL_SELECTIONS = ["1.5", "2.0", "2.5"] as const;

export type ModelSelection = typeof VALID_MODEL_SELECTIONS[number];
