/**
 * Shared difficulty helper for questions. Uses difficulty string and tags only (e.g. difficulty:easy in tags).
 */

export type DifficultyTier = "easy" | "medium" | "hard";

export interface QuestionWithDifficulty {
  difficulty?: string | null;
  tags?: string[];
}

/**
 * Returns "easy" | "medium" | "hard" from difficulty field or tags (e.g. difficulty:easy).
 */
export function getDifficultyTier(q: QuestionWithDifficulty): DifficultyTier {
  const raw =
    q.difficulty ||
    (q.tags || []).find((t) => typeof t === "string" && t.startsWith("difficulty:"))
      ?.toString()
      .replace(/^difficulty:/, "")
      .trim()
      .toLowerCase() ||
    "";
  if (raw === "easy") return "easy";
  if (raw === "hard") return "hard";
  return "medium";
}
