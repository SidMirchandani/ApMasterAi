import type { APScoreResult } from "@/lib/ap-score-utils";

/** User-facing strings for Fast Path (dashboard tile, study entry, page). */

export type FastPathScoreTier = "toward4" | "toward5" | "at5";

export function getFastPathScoreTier(predicted: APScoreResult | null): FastPathScoreTier {
  if (predicted == null || predicted.score < 4) return "toward4";
  if (predicted.score >= 5) return "at5";
  return "toward5";
}

export function getFastPathHeadline(predicted: APScoreResult | null): string {
  const tier = getFastPathScoreTier(predicted);
  if (tier === "at5") return FAST_PATH_COPY.keepYour5;
  if (tier === "toward5") return FAST_PATH_COPY.fastPathTo5;
  return FAST_PATH_COPY.fastPathTo4;
}

export function getFastPathPageTitle(
  subjectDisplayName: string,
  predicted: APScoreResult | null,
): string {
  return `${subjectDisplayName} · ${getFastPathHeadline(predicted)}`;
}

export function getGapStatusMessage(
  predicted: APScoreResult | null,
  gapTo4: number,
  gapTo5: number,
  currentPercentage: number,
): string {
  if (getFastPathScoreTier(predicted) === "at5") {
    return "You're projected at a 5. Sharpen weak units to stay exam-ready.";
  }
  if (gapTo4 === 0 && gapTo5 === 0) {
    return `You're at or above the projected range for a 4 and a 5. Weighted score: ~${currentPercentage}%.`;
  }
  return `You are +${gapTo4}% away from a 4, and +${gapTo5}% away from a 5.`;
}

export const FAST_PATH_COPY = {
  checkMyScore: "Fast Path: Check My Score",
  fastPathTo4: "Fast Path: Sprint to 4",
  fastPathTo5: "Fast Path: Sprint to 5",
  keepYour5: "Fast Path: Lock In Your 5",
  beta: "beta",
  diagnosticSubline: (qCount: number) =>
    `~30 min · predicted AP score + weak units`,
  diagnosticPauseLine: (qCount: number) =>
    `${qCount} questions · pause anytime`,
  practiceSublineSingle: (unitName: string, min: number) =>
    `Start with ${unitName} · ~${min} min`,
  practiceSublineMulti: (n: number, min: number) =>
    `${n} units · biggest score lift · ~${min} min`,
  practiceSublineManyUnits: (n: number, min: number) =>
    `${n} units left · ~${min} min`,
  skipMasteredHint: "Skip units you've already got down",
  maintainSubline: (min: number) => `Sharpen weak spots · ~${min} min`,
  timeDisclaimer:
    "~ minutes = estimated practice time (10 questions per unit), not a guaranteed score.",
  lockIn4: "Lock In Your 4",
  lockIn5: "Lock In Your 5",
  priorityPractice: "Priority Practice",
  morePractice: "More Practice",
  finalPolish: "Final Polish",
  securedUnits: "Secured Units",
  primaryBody: {
    below4: "Highest-yield units. Master these first to maximize your chance at a 4.",
    below5Single:
      "Your single highest-yield unit. Master this to close the gap to a 5.",
    below5Multi:
      "Highest-yield units. Master these to close the gap to a 5.",
    at5Single:
      "Your highest-yield unit that still has room to improve. Quick drills keep your 5 sharp.",
    at5Multi:
      "Highest-yield units with room to improve. Quick drills keep your 5 sharp on exam day.",
  },
  secondaryBody: {
    below4: "After your 4 is locked in, these units give you the biggest lift toward a 5.",
    below5: "These units will take you the rest of the way to a 5.",
    at5: "Optional polish on remaining units—you've already closed the gap to a 5.",
  },
  finalPolishBody:
    "Lower exam weight or tougher units—tackle these last once the higher-yield work is done.",
  securedBody:
    "You've mastered these. Run a quick refresher before exam day.",
} as const;

function predictedScore(predicted: APScoreResult | null): number {
  return predicted?.score ?? 0;
}

/** Top unit block: Lock in 4 / Lock in 5 / Priority practice */
export function getPrimarySectionTitle(predicted: APScoreResult | null): string {
  const score = predictedScore(predicted);
  if (score < 4) return FAST_PATH_COPY.lockIn4;
  if (score < 5) return FAST_PATH_COPY.lockIn5;
  return FAST_PATH_COPY.priorityPractice;
}

export function getPrimarySectionBody(
  predicted: APScoreResult | null,
  unitCount: number,
): string {
  const score = predictedScore(predicted);
  if (score >= 5) {
    return unitCount === 1
      ? FAST_PATH_COPY.primaryBody.at5Single
      : FAST_PATH_COPY.primaryBody.at5Multi;
  }
  if (score >= 4) {
    return unitCount === 1
      ? FAST_PATH_COPY.primaryBody.below5Single
      : FAST_PATH_COPY.primaryBody.below5Multi;
  }
  return FAST_PATH_COPY.primaryBody.below4;
}

/** Second unit block: Lock in 5 only when still below 4; otherwise More practice */
export function getSecondarySectionTitle(predicted: APScoreResult | null): string {
  const score = predictedScore(predicted);
  if (score < 4) return FAST_PATH_COPY.lockIn5;
  return FAST_PATH_COPY.morePractice;
}

export function getSecondarySectionBody(predicted: APScoreResult | null): string {
  const score = predictedScore(predicted);
  if (score >= 5) return FAST_PATH_COPY.secondaryBody.at5;
  if (score < 4) return FAST_PATH_COPY.secondaryBody.below4;
  return FAST_PATH_COPY.secondaryBody.below5;
}

/** @deprecated Use getPrimarySectionTitle */
export const getPhase1Title = getPrimarySectionTitle;
/** @deprecated Use getPrimarySectionBody */
export const getPhase1Body = getPrimarySectionBody;
/** @deprecated Use getSecondarySectionTitle */
export const getPhase2Title = getSecondarySectionTitle;
/** @deprecated Use getSecondarySectionBody */
export const getPhase2Body = getSecondarySectionBody;

export const DEFAULT_DIAGNOSTIC_QUESTION_COUNT = 35;
export const LEGACY_DIAGNOSTIC_QUESTION_COUNT = 25;
