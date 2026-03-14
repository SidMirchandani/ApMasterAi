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

/** Commonly-used short names for breadcrumbs and compact UI. */
export const SUBJECT_SHORT_NAMES: Record<string, string> = {
  APMACRO: "AP Macro",
  APMICRO: "AP Micro",
  APCSP: "AP CSP",
  APCHEM: "AP Chem",
  APGOV: "AP Gov",
  APPSYCH: "AP Psych",
  APBIO: "AP Bio",
  APCALCAB: "AP Calc AB",
  APCALCBC: "AP Calc BC",
  APCSA: "AP CSA",
  APUSH: "APUSH",
  APWH: "AP World",
  APEURO: "AP Euro",
  APLANG: "AP Lang",
  APLIT: "AP Lit",
  APSTATS: "AP Stats",
  APPHYS1: "AP Physics 1",
  APPHYS2: "AP Physics 2",
  APES: "APES",
  APHUG: "AP HuG",
};

export function getSubjectShortName(subjectCode: string): string {
  const code = subjectCode?.toUpperCase?.() ?? subjectCode;
  return SUBJECT_SHORT_NAMES[code] ?? subjectCode ?? "AP Course";
}

export function getSubjectDisplayName(subjectCode: string): string {
  const code = subjectCode?.toUpperCase?.() ?? subjectCode;
  return SUBJECT_DISPLAY_NAMES[code] ?? subjectCode ?? "—";
}
