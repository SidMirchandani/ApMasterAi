import { getAPSubjectConfig } from "./ap-subject-config";

const DIFFICULTY_WEIGHTS: Record<string, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

function getDifficulty(q: { difficulty?: string; tags?: string[] }): "easy" | "medium" | "hard" {
  const raw =
    q.difficulty ||
    (q.tags || [])
      .find((t) => typeof t === "string" && (t as string).startsWith("difficulty:"))
      ?.toString()
      .replace(/^difficulty:/, "")
      .trim()
      .toLowerCase() ||
    "";
  if (raw === "easy") return "easy";
  if (raw === "hard") return "hard";
  return "medium";
}

/**
 * Step 1: Weighted MCQ accuracy.
 * Easy=1, Medium=1.5, Hard=2 (untagged = medium).
 */
export function computeAdjustedMCQPercentage(
  questions: { answerIndex?: number; difficulty?: string; tags?: string[] }[],
  userAnswers: { [key: number]: string }
): number {
  let earned = 0;
  let possible = 0;
  questions.forEach((q, idx) => {
    const diff = getDifficulty(q);
    const weight = DIFFICULTY_WEIGHTS[diff] ?? 1.5;
    possible += weight;
    const correctLabel =
      q.answerIndex != null && q.answerIndex >= 0 && q.answerIndex < 5
        ? String.fromCharCode(65 + q.answerIndex)
        : "";
    if (userAnswers[idx] === correctLabel) earned += weight;
  });
  if (possible === 0) return 0;
  return earned / possible;
}

/**
 * Steps 2–3: Projected FRQ %, composite score, and mapped 1–5 score.
 */
export function computeProjectedAPScore(
  subjectCode: string,
  adjustedMCQPercent: number
): { compositeScore: number; projectedScore: number } {
  const config = getAPSubjectConfig(subjectCode);
  if (!config) {
    return { compositeScore: 0, projectedScore: 1 };
  }

  const projectedFRQPercent = adjustedMCQPercent * config.frq_penalty_modifier;
  const mcqPoints =
    adjustedMCQPercent * config.max_composite_points * config.mcq_weight;
  const frqPoints =
    projectedFRQPercent * config.max_composite_points * config.frq_weight;
  const compositeScore = mcqPoints + frqPoints;

  const th = config.curve_thresholds;
  let projectedScore = 1;
  if (compositeScore >= th["5"]) projectedScore = 5;
  else if (compositeScore >= th["4"]) projectedScore = 4;
  else if (compositeScore >= th["3"]) projectedScore = 3;
  else if (compositeScore >= th["2"]) projectedScore = 2;

  return { compositeScore, projectedScore };
}
