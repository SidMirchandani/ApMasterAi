/**
 * Student-friendly display names for AP subjects, used across the site
 * (admin insights, admin library, subject selectors, etc.).
 */
export const SUBJECT_DISPLAY_NAMES: Record<string, string> = {
  APMACRO: "AP Macroeconomics",
  APMICRO: "AP Microeconomics",
  APCSP: "AP Comp Sci Principles",
  APCHEM: "AP Chemistry",
  APGOV: "AP Gov",
  APPSYCH: "AP Psychology",
  APBIO: "AP Biology",
  APCALCAB: "AP Calculus AB",
  APCALCBC: "AP Calculus BC",
  APCSA: "AP Computer Science A",
  APUSH: "AP U.S. History",
  APWH: "AP World History",
  APEURO: "AP European History",
  APLANG: "AP Lang",
  APLIT: "AP Lit",
  APSTATS: "AP Statistics",
  APPHYS1: "AP Physics 1",
  APPHYS2: "AP Physics 2",
  APES: "AP Environmental Science",
  APHUG: "AP Human Geography",
};

export function getSubjectDisplayName(subjectCode: string): string {
  const code = subjectCode?.toUpperCase?.() ?? subjectCode;
  return SUBJECT_DISPLAY_NAMES[code] ?? subjectCode ?? "—";
}
