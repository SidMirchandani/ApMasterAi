/** STEM / calc-allowed subjects — aligned with PracticeQuiz full-length rules */
export const CALCULATOR_SUBJECT_IDS = [
  "calculus-ab",
  "calculus-bc",
  "statistics",
  "chemistry",
  "physics-1",
  "physics-2",
] as const;

export function isCalculatorAllowedForSubject(subjectId: string | undefined): boolean {
  if (!subjectId) return false;
  return CALCULATOR_SUBJECT_IDS.includes(subjectId as (typeof CALCULATOR_SUBJECT_IDS)[number]);
}
