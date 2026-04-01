import { getSubjectConfig } from "./subjects-helper";

export interface VarsitySubjectConfig {
  subjectCode: string;
  displayName: string;
  practiceUrl: string;
}

const VARSITY_SUBJECT_URLS: Record<string, string> = {
  APUSH: "https://www.varsitytutors.com/practice/subjects/ap-us-history/practice",
  APLANG: "https://www.varsitytutors.com/practice/subjects/ap-english-language-and-composition/practice",
  APLIT: "https://www.varsitytutors.com/practice/subjects/ap-english-literature-and-composition/practice",
  APBIO: "https://www.varsitytutors.com/practice/subjects/ap-biology/practice",
  APCHEM: "https://www.varsitytutors.com/practice/subjects/ap-chemistry/practice",
  APSTATS: "https://www.varsitytutors.com/practice/subjects/ap-statistics/practice",
  APCALCAB: "https://www.varsitytutors.com/practice/subjects/ap-calculus-ab/practice",
  APCALCBC: "https://www.varsitytutors.com/practice/subjects/ap-calculus-bc/practice",
  APMACRO: "https://www.varsitytutors.com/practice/subjects/ap-macroeconomics/practice",
  APMICRO: "https://www.varsitytutors.com/practice/subjects/ap-microeconomics/practice",
  APPSYCH: "https://www.varsitytutors.com/practice/subjects/ap-psychology/practice",
  APGOV: "https://www.varsitytutors.com/practice/subjects/ap-us-government-and-politics/practice",
  APEURO: "https://www.varsitytutors.com/practice/subjects/ap-european-history/practice",
  APWORLD: "https://www.varsitytutors.com/practice/subjects/ap-world-history/practice",
  APCSA: "https://www.varsitytutors.com/practice/subjects/ap-computer-science-a/practice",
  APCSP: "https://www.varsitytutors.com/practice/subjects/ap-computer-science-principles/practice",
  APPHYS1: "https://www.varsitytutors.com/practice/subjects/ap-physics-1-algebra-based/practice",
  APPHYS2: "https://www.varsitytutors.com/practice/subjects/ap-physics-2-algebra-based/practice",
};

export function getVarsitySubjectConfig(subjectCode: string): VarsitySubjectConfig | null {
  const base = getSubjectConfig(subjectCode);
  if (!base) return null;

  const practiceUrl = VARSITY_SUBJECT_URLS[subjectCode];
  if (!practiceUrl) return null;

  return {
    subjectCode: base.subjectCode,
    displayName: base.displayName,
    practiceUrl,
  };
}

