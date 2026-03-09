/**
 * AP score conversion: raw percentage → estimated composite → 1–5 scale
 * using subject-specific grading curves from ap-subject-config.
 */

import apSubjectConfig from "@/data/ap-subject-config.json";

export interface APSubjectConfigEntry {
  subject_code: string;
  max_composite_points: number;
  mcq_weight: number;
  frq_weight: number;
  frq_penalty_modifier: number;
  curve_thresholds: { "5": number; "4": number; "3": number; "2": number };
}

export interface APScoreResult {
  score: number;
  label: string;
  color: string;
}

const AP_SCORE_LABELS: Record<number, string> = {
  5: "Extremely well qualified",
  4: "Well qualified",
  3: "Qualified",
  2: "Possibly qualified",
  1: "Needs improvement",
};

const AP_SCORE_COLORS: Record<number, string> = {
  5: "#10b981",
  4: "#22c55e",
  3: "#eab308",
  2: "#f97316",
  1: "#ef4444",
};

const CONFIG = apSubjectConfig as APSubjectConfigEntry[];

function findSubjectConfig(subjectCode: string): APSubjectConfigEntry | null {
  if (!subjectCode) return null;
  return CONFIG.find((c) => c.subject_code === subjectCode) ?? null;
}

/**
 * Map composite points to AP score 1–5 using curve thresholds.
 */
function compositeToAPScore(
  composite: number,
  curve_thresholds: { "5": number; "4": number; "3": number; "2": number }
): number {
  if (composite >= curve_thresholds["5"]) return 5;
  if (composite >= curve_thresholds["4"]) return 4;
  if (composite >= curve_thresholds["3"]) return 3;
  if (composite >= curve_thresholds["2"]) return 2;
  return 1;
}

/**
 * Weighted projection: treat avgPercentage as MCQ ability, project FRQ, then composite → 1–5.
 * Uses mcq_weight, frq_weight, frq_penalty_modifier, max_composite_points, curve_thresholds.
 * Returns null if config missing or incomplete.
 */
function weightedPercentageToAPScore(
  avgPercentage: number,
  subjectCode: string | undefined
): APScoreResult | null {
  const config = findSubjectConfig(subjectCode ?? "");
  if (!config) return null;

  const mcqRatio = avgPercentage / 100;
  const projectedFrqAccuracy = mcqRatio * config.frq_penalty_modifier;
  const mcqPoints = mcqRatio * (config.max_composite_points * config.mcq_weight);
  const frqPoints = projectedFrqAccuracy * (config.max_composite_points * config.frq_weight);
  const totalComposite = mcqPoints + frqPoints;

  const score = compositeToAPScore(totalComposite, config.curve_thresholds);
  return {
    score,
    label: getAPScoreLabel(score),
    color: getAPScoreColor(score),
  };
}

/**
 * Convert a raw percentage (0–100) to an AP score (1–5) using the subject's
 * max_composite_points and curve_thresholds. Returns null if subject is not
 * in config (caller should show original percentage).
 */
export function percentageToAPScore(
  percentage: number,
  subjectCode: string | undefined
): APScoreResult | null {
  const config = findSubjectConfig(subjectCode ?? "");
  if (!config) return null;

  const estimatedComposite = (percentage / 100) * config.max_composite_points;
  const th = config.curve_thresholds;

  let score = 1;
  if (estimatedComposite >= th["5"]) score = 5;
  else if (estimatedComposite >= th["4"]) score = 4;
  else if (estimatedComposite >= th["3"]) score = 3;
  else if (estimatedComposite >= th["2"]) score = 2;

  return {
    score,
    label: getAPScoreLabel(score),
    color: getAPScoreColor(score),
  };
}

export function getAPScoreLabel(score: number): string {
  return AP_SCORE_LABELS[score] ?? "—";
}

export function getAPScoreColor(score: number): string {
  return AP_SCORE_COLORS[score] ?? "#6b7280";
}

/** Fallback when subject has no curve config (fixed percentage bands). */
function fallbackAPScore(accuracy: number): APScoreResult {
  if (accuracy >= 85) return { score: 5, label: AP_SCORE_LABELS[5], color: AP_SCORE_COLORS[5] };
  if (accuracy >= 70) return { score: 4, label: AP_SCORE_LABELS[4], color: AP_SCORE_COLORS[4] };
  if (accuracy >= 55) return { score: 3, label: AP_SCORE_LABELS[3], color: AP_SCORE_COLORS[3] };
  if (accuracy >= 40) return { score: 2, label: AP_SCORE_LABELS[2], color: AP_SCORE_COLORS[2] };
  return { score: 1, label: AP_SCORE_LABELS[1], color: AP_SCORE_COLORS[1] };
}

/**
 * Predicted AP score from average test percentage. Uses weighted projection (MCQ + projected FRQ)
 * and subject curve when config is available; otherwise fallback bands.
 */
export function getPredictedAPScoreFromTests(
  avgTestPercentage: number,
  subjectCode: string | undefined
): APScoreResult {
  const weightedResult = weightedPercentageToAPScore(avgTestPercentage, subjectCode);
  return weightedResult ?? fallbackAPScore(avgTestPercentage);
}

export interface TargetPercentages {
  target2: number;
  target3: number;
  target4: number;
  target5: number;
}

/**
 * Returns the percentage needed for AP score 2, 3, 4, and 5 for the given subject,
 * using curve_thresholds and max_composite_points. Rounded to 1 decimal.
 * Fallback when subject config is not found.
 */
export function getTargetPercentagesForSubject(
  subjectCode: string | undefined
): TargetPercentages {
  const config = findSubjectConfig(subjectCode ?? "");
  if (!config) {
    return { target2: 40, target3: 55, target4: 70, target5: 85 };
  }
  const { max_composite_points, curve_thresholds } = config;
  const target5 = Math.round((curve_thresholds["5"] / max_composite_points) * 1000) / 10;
  const target4 = Math.round((curve_thresholds["4"] / max_composite_points) * 1000) / 10;
  const target3 = Math.round((curve_thresholds["3"] / max_composite_points) * 1000) / 10;
  const target2 = Math.round((curve_thresholds["2"] / max_composite_points) * 1000) / 10;
  return { target2, target3, target4, target5 };
}
