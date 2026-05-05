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

export interface ProjectionTestHistoryEntry {
  percentage: number;
  type?: "full-length" | "diagnostic" | "unit";
  sectionBreakdown?: Record<string, { correct: number; total: number; percentage?: number }>;
}

const AP_SCORE_LABELS: Record<number, string> = {
  5: "Extremely well qualified",
  4: "Well qualified",
  3: "Qualified",
  2: "Possibly qualified",
  1: "Needs improvement",
};

/* 5-scale: dark green (5) → medium green (4) → light green (3) → light red (2) → dark red (1) */
const AP_SCORE_COLORS: Record<number, string> = {
  5: "#15803d",
  4: "#16a34a",
  3: "#22c55e",
  2: "#f87171",
  1: "#b91c1c",
};

const CONFIG = apSubjectConfig as APSubjectConfigEntry[];
const MIN_UNITS_FOR_UNIT_ONLY_PROJECTION = 3;
const MIN_WEIGHTED_COVERAGE_FOR_UNIT_ONLY = 40;

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
  // Use the subject's official curve directly on the latest student score
  // so the predicted AP score is easy to interpret. Fall back to simple
  // percentage bands when no subject config exists.
  const directResult = percentageToAPScore(avgTestPercentage, subjectCode);
  return directResult ?? fallbackAPScore(avgTestPercentage);
}

function isFullLengthTest(test: ProjectionTestHistoryEntry): boolean {
  return test.type === "full-length" || test.type == null;
}

export function getPerUnitScoresForWeightedProjection(params: {
  unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }>;
  testHistory: ProjectionTestHistoryEntry[];
  unitWeights: Record<string, number>;
}): Record<string, number> {
  const { unitProgressMap, testHistory, unitWeights } = params;
  const weightKeys = Object.keys(unitWeights);
  if (weightKeys.length === 0) return {};

  const sectionBest: Record<string, number> = {};
  for (const test of testHistory) {
    if (!isFullLengthTest(test)) continue;
    const breakdown = test.sectionBreakdown;
    if (!breakdown) continue;
    for (const [code, section] of Object.entries(breakdown)) {
      const pct = section.total > 0 ? Math.round((section.correct / section.total) * 100) : 0;
      sectionBest[code] = Math.max(sectionBest[code] ?? 0, pct);
    }
  }

  const unitBest: Record<string, number> = {};
  for (const [code, progress] of Object.entries(unitProgressMap)) {
    unitBest[code] = Math.max(progress.highestScore ?? 0, progress.mcqScore ?? 0);
  }

  const out: Record<string, number> = {};
  for (const code of weightKeys) {
    out[code] = Math.max(unitBest[code] ?? 0, sectionBest[code] ?? 0);
  }
  return out;
}

function getBestFullLengthDerivedPercent(testHistory: ProjectionTestHistoryEntry[]): number | null {
  let best: number | null = null;
  for (const test of testHistory) {
    if (!isFullLengthTest(test)) continue;
    const breakdown = test.sectionBreakdown;
    if (!breakdown || Object.keys(breakdown).length === 0) {
      const fallbackPct = Math.round(test.percentage);
      best = best == null ? fallbackPct : Math.max(best, fallbackPct);
      continue;
    }

    let weightedSum = 0;
    let totalWeight = 0;
    for (const section of Object.values(breakdown)) {
      const sectionWeight = section.total > 0 ? section.total : 0;
      if (sectionWeight <= 0) continue;
      const sectionPct =
        typeof section.percentage === "number"
          ? section.percentage
          : Math.round((section.correct / section.total) * 100);
      weightedSum += sectionPct * sectionWeight;
      totalWeight += sectionWeight;
    }
    if (totalWeight > 0) {
      const derived = Math.round(weightedSum / totalWeight);
      best = best == null ? derived : Math.max(best, derived);
    }
  }
  return best;
}

function getExplicitUnitWeightedPercent(params: {
  unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }>;
  unitWeights: Record<string, number>;
}): { percent: number | null; unitsCompleted: number; weightedCoverage: number } {
  const { unitProgressMap, unitWeights } = params;
  const weightedEntries = Object.entries(unitWeights);
  if (weightedEntries.length === 0) {
    return { percent: null, unitsCompleted: 0, weightedCoverage: 0 };
  }

  const totalWeight = weightedEntries.reduce((sum, [, weight]) => sum + weight, 0);
  let observedWeight = 0;
  let observedWeightedSum = 0;
  let unitsCompleted = 0;

  for (const [code, weight] of weightedEntries) {
    const best = Math.max(unitProgressMap[code]?.highestScore ?? 0, unitProgressMap[code]?.mcqScore ?? 0);
    if (best > 0) {
      unitsCompleted += 1;
      observedWeight += weight;
      observedWeightedSum += best * weight;
    }
  }

  return {
    percent: observedWeight > 0 ? Math.round(observedWeightedSum / observedWeight) : null,
    unitsCompleted,
    weightedCoverage: totalWeight > 0 ? Math.round((observedWeight / totalWeight) * 100) : 0,
  };
}

/**
 * Computes the projected percentage used for AP score prediction.
 *
 * Uses the Analytics-page methodology: take the best per-unit score
 * (max of stored unitProgress scores and aggregated test sectionBreakdown),
 * then average those bests across all units that have any data.
 * Falls back to a simple average of full-test percentages when no
 * per-unit data exists.
 */
export function computeProjectedPercentage(params: {
  unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }>;
  testHistory: ProjectionTestHistoryEntry[];
  unitWeights?: Record<string, number>;
}): { projectedPercentage: number; hasEnoughForPrediction: boolean } {
  const { unitProgressMap, testHistory, unitWeights } = params;
  const hasFullLengthEvidence = testHistory.some((test) => isFullLengthTest(test));
  const hasWeights = unitWeights != null && Object.keys(unitWeights).length > 0;
  const weightedFromUnits =
    hasWeights && unitWeights
      ? getExplicitUnitWeightedPercent({ unitProgressMap, unitWeights })
      : { percent: null, unitsCompleted: 0, weightedCoverage: 0 };
  const fullLengthDerived = getBestFullLengthDerivedPercent(testHistory);

  const projectedPercentage = hasFullLengthEvidence
    ? Math.max(weightedFromUnits.percent ?? 0, fullLengthDerived ?? 0)
    : weightedFromUnits.percent != null
      ? weightedFromUnits.percent
      : testHistory.length > 0
        ? Math.round(testHistory[testHistory.length - 1].percentage)
        : 0;

  const hasEnoughForPrediction = hasFullLengthEvidence
    ? projectedPercentage > 0
    : weightedFromUnits.unitsCompleted >= MIN_UNITS_FOR_UNIT_ONLY_PROJECTION &&
      weightedFromUnits.weightedCoverage >= MIN_WEIGHTED_COVERAGE_FOR_UNIT_ONLY &&
      projectedPercentage > 0;

  return { projectedPercentage, hasEnoughForPrediction };
}

export interface TargetPercentages {
  target2: number;
  target3: number;
  target4: number;
  target5: number;
}

export type UnitTier = "5" | "4" | "3" | "2" | "1" | "none";

export interface UnitTierResult {
  tier: UnitTier;
  label: string;
  bg: string;
  textClass: string;
}

/* 5-scale: 1=dark red, 2=light red, 3=light green, 4=medium green, 5=dark green */
const UNIT_TIER_STYLES: Record<Exclude<UnitTier, "none">, { label: string; bg: string; textClass: string }> = {
  "1": { label: "Weak", bg: "bg-red-700 dark:bg-red-800", textClass: "text-red-700 dark:text-red-400" },
  "2": { label: "Needs Practice", bg: "bg-red-400 dark:bg-red-500", textClass: "text-red-600 dark:text-red-300" },
  "3": { label: "In Progress", bg: "bg-green-300 dark:bg-green-400", textClass: "text-green-600 dark:text-green-400" },
  "4": { label: "Proficient", bg: "bg-green-600 dark:bg-green-600", textClass: "text-green-700 dark:text-green-300" },
  "5": { label: "Mastered", bg: "bg-green-700 dark:bg-green-800", textClass: "text-green-800 dark:text-green-200" },
};

/**
 * Maps a unit percentage to the same tier and colors used on the Analytics "Performance by Unit" section.
 * Use subject-specific targets from getTargetPercentagesForSubject so Dashboard and Study match Analytics.
 */
export function getUnitTierFromScore(
  score: number,
  targets: TargetPercentages
): UnitTierResult {
  if (score <= 0) {
    return {
      tier: "none",
      label: "Not Started",
      bg: "bg-slate-200 dark:bg-slate-700",
      textClass: "text-slate-500 dark:text-slate-400",
    };
  }
  const { target2, target3, target4, target5 } = targets;
  if (score >= target5) return { tier: "5", ...UNIT_TIER_STYLES["5"] };
  if (score >= target4) return { tier: "4", ...UNIT_TIER_STYLES["4"] };
  if (score >= target3) return { tier: "3", ...UNIT_TIER_STYLES["3"] };
  if (score >= target2) return { tier: "2", ...UNIT_TIER_STYLES["2"] };
  return { tier: "1", ...UNIT_TIER_STYLES["1"] };
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
