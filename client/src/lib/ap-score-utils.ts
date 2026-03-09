/**
 * AP score conversion: raw percentage → estimated composite → 1–5 scale
 * using subject-specific grading curves from ap-subject-config.
 */

import apSubjectConfig from "@/data/ap-subject-config.json";

export interface APSubjectConfigEntry {
  subject_code: string;
  max_composite_points: number;
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
 * Predicted AP score from average test percentage. Uses subject curve when available,
 * otherwise fallback bands. Use when you have at least one full-length test (same logic as Analytics).
 */
export function getPredictedAPScoreFromTests(
  avgTestPercentage: number,
  subjectCode: string | undefined
): APScoreResult {
  const curveResult = percentageToAPScore(avgTestPercentage, subjectCode);
  return curveResult ?? fallbackAPScore(avgTestPercentage);
}
