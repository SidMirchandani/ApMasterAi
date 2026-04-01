export interface CanonicalSubjectConfig {
  code: string;
  legacyId: string;
  displayName: string;
  shortName: string;
  /** Number of MCQ options (4 = A–D, 5 = A–E). Default 5. */
  mcqOptionCount: number;
}

export const CANONICAL_SUBJECTS: CanonicalSubjectConfig[] = [
  {
    code: "APMACRO",
    legacyId: "macroeconomics",
    displayName: "AP Macroeconomics",
    shortName: "AP Macro",
    mcqOptionCount: 5,
  },
  {
    code: "APMICRO",
    legacyId: "microeconomics",
    displayName: "AP Microeconomics",
    shortName: "AP Micro",
    mcqOptionCount: 5,
  },
  {
    code: "APCSP",
    legacyId: "computer-science-principles",
    displayName: "AP Comp Sci Principles",
    shortName: "AP CSP",
    mcqOptionCount: 4,
  },
  {
    code: "APCHEM",
    legacyId: "chemistry",
    displayName: "AP Chemistry",
    shortName: "AP Chem",
    mcqOptionCount: 5,
  },
  {
    code: "APGOV",
    legacyId: "government",
    displayName: "AP Gov",
    shortName: "AP Gov",
    mcqOptionCount: 5,
  },
  {
    code: "APPSYCH",
    legacyId: "psychology",
    displayName: "AP Psychology",
    shortName: "AP Psych",
    mcqOptionCount: 5,
  },
  {
    code: "APBIO",
    legacyId: "biology",
    displayName: "AP Biology",
    shortName: "AP Bio",
    mcqOptionCount: 5,
  },
  {
    code: "APCALCAB",
    legacyId: "calculus-ab",
    displayName: "AP Calculus AB",
    shortName: "AP Calc AB",
    mcqOptionCount: 4,
  },
  {
    code: "APCALCBC",
    legacyId: "calculus-bc",
    displayName: "AP Calculus BC",
    shortName: "AP Calc BC",
    mcqOptionCount: 4,
  },
  {
    code: "APCSA",
    legacyId: "computer-science-a",
    displayName: "AP Computer Science A",
    shortName: "AP CSA",
    mcqOptionCount: 4,
  },
  {
    code: "APUSH",
    legacyId: "us-history",
    displayName: "AP U.S. History",
    shortName: "AP USH",
    mcqOptionCount: 4,
  },
  {
    code: "APWORLD",
    legacyId: "world-history",
    displayName: "AP World History: Modern",
    shortName: "AP World",
    mcqOptionCount: 4,
  },
  {
    code: "APEURO",
    legacyId: "european-history",
    displayName: "AP European History",
    shortName: "AP Euro",
    mcqOptionCount: 4,
  },
  {
    code: "APLANG",
    legacyId: "english-language",
    displayName: "AP Lang",
    shortName: "AP Lang",
    mcqOptionCount: 4,
  },
  {
    code: "APLIT",
    legacyId: "english-literature",
    displayName: "AP Lit",
    shortName: "AP Lit",
    mcqOptionCount: 4,
  },
  {
    code: "APSTATS",
    legacyId: "statistics",
    displayName: "AP Statistics",
    shortName: "AP Stats",
    mcqOptionCount: 5,
  },
  {
    code: "APPHYS1",
    legacyId: "physics-1",
    displayName: "AP Physics 1",
    shortName: "AP Physics 1",
    mcqOptionCount: 5,
  },
  {
    code: "APPHYS2",
    legacyId: "physics-2",
    displayName: "AP Physics 2",
    shortName: "AP Physics 2",
    mcqOptionCount: 5,
  },
];

const byCode = new Map<string, CanonicalSubjectConfig>(
  CANONICAL_SUBJECTS.map((s) => [s.code, s]),
);

const byLegacyId = new Map<string, CanonicalSubjectConfig>(
  CANONICAL_SUBJECTS.map((s) => [s.legacyId, s]),
);

export function getCanonicalSubjectByCode(code: string): CanonicalSubjectConfig | undefined {
  return byCode.get(code.toUpperCase());
}

export function getCanonicalSubjectByLegacyId(legacyId: string): CanonicalSubjectConfig | undefined {
  return byLegacyId.get(legacyId);
}

export function getCanonicalSubjectDisplayName(code: string): string {
  return getCanonicalSubjectByCode(code)?.displayName ?? code;
}

export function getCanonicalSubjectShortName(code: string): string {
  return getCanonicalSubjectByCode(code)?.shortName ?? code;
}

export function getCanonicalMcqOptionCount(codeOrLegacyId: string): number {
  const byCodeMatch = getCanonicalSubjectByCode(codeOrLegacyId);
  if (byCodeMatch) return byCodeMatch.mcqOptionCount;
  const byLegacyMatch = getCanonicalSubjectByLegacyId(codeOrLegacyId);
  return byLegacyMatch?.mcqOptionCount ?? 5;
}

