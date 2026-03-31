export type SectionDef = {
  code: string;
  name: string;
  /** Optional midpoint of the published exam weight range (percentage). */
  examWeightMid?: number;
  /** Optional diagnostic weight from DIAGNOSTIC_UNIT_WEIGHTS (percentage). */
  diagnosticWeight?: number;
  /** Optional diagnostic difficulty from DIAGNOSTIC_UNIT_DIFFICULTIES (1–5). */
  diagnosticDifficulty?: number;
};

export type SubjectSections = Record<string, SectionDef[]>;

// Canonical unit/section definitions per AP subject.
// Keep this in sync with:
// - scripts/subjects/*/sections.ts (scraping + content scripts)
// - EXAM_WEIGHTS in pages/api/questions.ts
// - DIAGNOSTIC_UNIT_WEIGHTS / DIAGNOSTIC_UNIT_DIFFICULTIES in server/ap-subject-config.ts
export const SUBJECT_SECTIONS: SubjectSections = {
  APMACRO: [
    { code: "BEC", name: "Basic Economic Concepts", examWeightMid: 7.5, diagnosticWeight: 5 },
    { code: "EIBC", name: "Economic Indicators & Business Cycle", examWeightMid: 14.5, diagnosticWeight: 12 },
    { code: "NIPD", name: "National Income & Price Determination", examWeightMid: 22, diagnosticWeight: 17 },
    { code: "FS", name: "Financial Sector", examWeightMid: 20.5, diagnosticWeight: 18 },
    { code: "LRCSP", name: "Long-Run Consequences of Stabilization Policies", examWeightMid: 25, diagnosticWeight: 20 },
    { code: "OEITF", name: "Open Economy—International Trade and Finance", examWeightMid: 11.5, diagnosticWeight: 10 },
  ],
  APMICRO: [
    { code: "BEC", name: "Basic Economic Concepts", examWeightMid: 13.5, diagnosticWeight: 13.5 },
    { code: "SD", name: "Supply and Demand", examWeightMid: 22.5, diagnosticWeight: 22.5 },
    { code: "PC", name: "Production, Cost, and the Perfectly Competitive Market", examWeightMid: 23.5, diagnosticWeight: 23.5 },
    { code: "IMP", name: "Imperfect Competition", examWeightMid: 18.5, diagnosticWeight: 18.5 },
    { code: "FM", name: "Factor Markets", examWeightMid: 11.5, diagnosticWeight: 11.5 },
    { code: "MF", name: "Market Failure and the Role of Government", examWeightMid: 10.5, diagnosticWeight: 10.5 },
  ],
  APCSP: [
    { code: "CRD", name: "Creative Development", examWeightMid: 11.5, diagnosticWeight: 11.5 },
    { code: "DAT", name: "Data", examWeightMid: 19.5, diagnosticWeight: 19.5 },
    { code: "AAP", name: "Algorithms and Programming", examWeightMid: 32.5, diagnosticWeight: 32.5 },
    { code: "CSN", name: "Computer Systems and Networks", examWeightMid: 13, diagnosticWeight: 13 },
    { code: "IOC", name: "Impact of Computing", examWeightMid: 23.5, diagnosticWeight: 23.5 },
  ],
  APCHEM: [
    { code: "ASP", name: "Atomic Structure & Properties", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 2.0 },
    { code: "MIS", name: "Molecular & Ionic Structure", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 2.5 },
    { code: "IMF", name: "Intermolecular Forces & Properties", examWeightMid: 20, diagnosticWeight: 20, diagnosticDifficulty: 3.5 },
    { code: "RXN", name: "Chemical Reactions", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 3.0 },
    { code: "KIN", name: "Kinetics", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 4.0 },
    { code: "THERMO", name: "Thermodynamics", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 4.5 },
    { code: "EQM", name: "Equilibrium", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 4.5 },
    { code: "ACB", name: "Acids & Bases", examWeightMid: 13, diagnosticWeight: 13, diagnosticDifficulty: 5.0 },
    { code: "ATD", name: "Applications of Thermodynamics", examWeightMid: 8, diagnosticWeight: 8, diagnosticDifficulty: 4.8 },
  ],
  APGOV: [
    { code: "FAD", name: "Foundations of American Democracy", examWeightMid: 18.5, diagnosticWeight: 18.5, diagnosticDifficulty: 2.5 },
    { code: "IAB", name: "Interactions Among Branches of Government", examWeightMid: 30.5, diagnosticWeight: 30.5, diagnosticDifficulty: 4.0 },
    { code: "CLCR", name: "Civil Liberties and Civil Rights", examWeightMid: 15.5, diagnosticWeight: 15.5, diagnosticDifficulty: 4.0 },
    { code: "APIB", name: "American Political Ideologies and Beliefs", examWeightMid: 12.5, diagnosticWeight: 12.5, diagnosticDifficulty: 3.0 },
    { code: "PP", name: "Political Participation", examWeightMid: 23.5, diagnosticWeight: 23.5, diagnosticDifficulty: 2.5 },
  ],
  APPSYCH: [
    { code: "BIO", name: "Biological Bases of Behavior", examWeightMid: 20, diagnosticWeight: 20, diagnosticDifficulty: 4.0 },
    { code: "COG", name: "Cognition", examWeightMid: 20, diagnosticWeight: 20, diagnosticDifficulty: 3.5 },
    { code: "DEV", name: "Development and Learning", examWeightMid: 20, diagnosticWeight: 20, diagnosticDifficulty: 2.5 },
    { code: "SOC", name: "Social Psychology and Personality", examWeightMid: 20, diagnosticWeight: 20, diagnosticDifficulty: 2.0 },
    { code: "MPH", name: "Mental and Physical Health", examWeightMid: 20, diagnosticWeight: 20, diagnosticDifficulty: 3.0 },
  ],
  // Additional subjects can be added here as they are migrated to the unified config.
};

export const SUBJECT_SECTION_CODES: Record<string, string[]> = Object.fromEntries(
  Object.entries(SUBJECT_SECTIONS).map(([subject, sections]) => [
    subject,
    sections.map((s) => s.code),
  ]),
);

