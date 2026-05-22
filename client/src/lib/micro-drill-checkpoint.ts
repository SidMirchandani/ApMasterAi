import { getTargetPercentagesForSubject } from "@/lib/ap-score-utils";
import { getApiCodeForSubject } from "@/subjects";

export const MICRO_DRILL_ROUND_SIZE = 5;
export const MICRO_DRILL_MAX_SESSION_QUESTIONS = 25;

export type CheckpointRecommendation = "end" | "continue" | "neutral";

export interface MicroDrillCheckpointInput {
  roundCorrect: number;
  roundTotal: number;
  sessionCorrect: number;
  sessionTotal: number;
  roundNumber: number;
  goalScore: 4 | 5;
  subjectId: string;
}

export interface MicroDrillCheckpointResult {
  recommendation: CheckpointRecommendation;
  roundPct: number;
  sessionPct: number;
  targetPct: number;
  atSessionCap: boolean;
  canContinue: boolean;
  headline: string;
  detail: string;
  endLabel: string;
  continueLabel: string;
}

export function getMicroDrillGoalScore(
  predictedScore: number | null | undefined,
): 4 | 5 {
  if (predictedScore == null || predictedScore < 4) return 4;
  return 5;
}

export function getMicroDrillCheckpoint(
  input: MicroDrillCheckpointInput,
): MicroDrillCheckpointResult {
  const {
    roundCorrect,
    roundTotal,
    sessionCorrect,
    sessionTotal,
    roundNumber,
    goalScore,
    subjectId,
  } = input;

  const roundPct =
    roundTotal > 0 ? Math.round((roundCorrect / roundTotal) * 100) : 0;
  const sessionPct =
    sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

  const subjectCode = getApiCodeForSubject(subjectId);
  const targets = getTargetPercentagesForSubject(subjectCode);
  const targetPct = goalScore === 5 ? targets.target5 : targets.target4;

  const atSessionCap = sessionTotal >= MICRO_DRILL_MAX_SESSION_QUESTIONS;
  const canContinue =
    !atSessionCap && sessionTotal + MICRO_DRILL_ROUND_SIZE <= MICRO_DRILL_MAX_SESSION_QUESTIONS;

  let recommendation: CheckpointRecommendation = "neutral";

  if (atSessionCap) {
    recommendation = "end";
  } else if (roundPct >= targetPct || roundCorrect === roundTotal) {
    recommendation = "end";
  } else if (roundPct < targets.target3) {
    recommendation = "continue";
  } else if (
    roundNumber >= 2 &&
    sessionPct >= targetPct &&
    sessionTotal >= MICRO_DRILL_ROUND_SIZE * 2
  ) {
    recommendation = "end";
  }

  const goalLabel = String(goalScore);

  let headline = `You got ${roundCorrect}/${roundTotal} this round (${roundPct}%)`;
  let detail = `Session: ${sessionCorrect}/${sessionTotal} (${sessionPct}%). Target for a ${goalLabel}: ~${Math.round(targetPct)}%.`;

  if (atSessionCap) {
    headline = `Round ${roundNumber} complete`;
    detail = `You've answered ${sessionTotal} questions this session. End practice to save your progress.`;
  } else if (recommendation === "end") {
    detail = `You're in good shape for a ${goalLabel} on this unit. End here and move to your next Fast Path unit, or keep practicing if you want.`;
  } else if (recommendation === "continue") {
    detail = `You're below what you need for a ${goalLabel} on this unit (~${Math.round(targetPct)}%). Another round of 5 can help.`;
  }

  return {
    recommendation,
    roundPct,
    sessionPct,
    targetPct,
    atSessionCap,
    canContinue,
    headline,
    detail,
    endLabel: "End practice",
    continueLabel: canContinue ? "Continue practice" : "Continue practice",
  };
}
