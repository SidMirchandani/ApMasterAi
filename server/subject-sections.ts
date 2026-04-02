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
  // Additional subjects using the unified unit config
  APLANG: [
    { code: "CRE", name: "Claims, Reasoning, and Evidence" },
    { code: "SS", name: "Synthesizing Sources" },
    { code: "RS", name: "Rhetorical Situation" },
    { code: "OC", name: "Organization and Commentary" },
    { code: "ARG", name: "Argumentation" },
  ],
  APLIT: [
    { code: "SF1", name: "Short Fiction I" },
    { code: "PO1", name: "Poetry I" },
    { code: "LF1", name: "Longer Fiction or Drama I" },
    { code: "SF2", name: "Short Fiction II" },
    { code: "PO2", name: "Poetry II" },
    { code: "LF2", name: "Longer Fiction or Drama II" },
    { code: "SF3", name: "Short Fiction III" },
    { code: "PO3", name: "Poetry III" },
    { code: "LF3", name: "Longer Fiction or Drama III" },
  ],
  APBIO: [
    { code: "CL", name: "Chemistry of Life" },
    { code: "CSF", name: "Cell Structure and Function" },
    { code: "CE", name: "Cellular Energetics" },
    { code: "CCC", name: "Cell Communication and Cell Cycle" },
    { code: "HER", name: "Heredity" },
    { code: "GER", name: "Gene Expression and Regulation" },
    { code: "NS", name: "Natural Selection" },
    { code: "ECO", name: "Ecology" },
  ],
  APSTATS: [
    { code: "EOV", name: "Exploring One-Variable Data" },
    { code: "ETV", name: "Exploring Two-Variable Data" },
    { code: "CD", name: "Collecting Data" },
    { code: "PRD", name: "Probability, Random Variables, and Distributions" },
    { code: "SD", name: "Sampling Distributions" },
    { code: "ICP", name: "Inference for Categorical Data: Proportions" },
    { code: "IQM", name: "Inference for Quantitative Data: Means" },
    { code: "ICC", name: "Inference for Categorical Data: Chi-Square" },
    { code: "IQS", name: "Inference for Quantitative Data: Slopes" },
  ],
  APCALCAB: [
    { code: "LIM", name: "Limits and Continuity" },
    { code: "DDF", name: "Differentiation: Definition and Fundamental Properties" },
    { code: "DCI", name: "Differentiation: Composite, Implicit, and Inverse Functions" },
    { code: "CAD", name: "Contextual Applications of Differentiation" },
    { code: "AAD", name: "Analytical Applications of Differentiation" },
    { code: "IAC", name: "Integration and Accumulation of Change" },
    { code: "DE", name: "Differential Equations" },
    { code: "AI", name: "Applications of Integration" },
  ],
  APCALCBC: [
    { code: "LIM", name: "Limits and Continuity" },
    { code: "DDF", name: "Differentiation: Definition and Properties" },
    { code: "DCI", name: "Differentiation: Composite, Implicit, Inverse" },
    { code: "CAD", name: "Contextual Applications of Differentiation" },
    { code: "AAD", name: "Analytical Applications of Differentiation" },
    { code: "IAC", name: "Integration and Accumulation of Change" },
    { code: "DE", name: "Differential Equations" },
    { code: "AI", name: "Applications of Integration" },
    { code: "PPV", name: "Parametric, Polar, and Vector-Valued Functions" },
    { code: "ISS", name: "Infinite Sequences and Series" },
  ],
  APUSH: [
    { code: "P1", name: "Period 1: 1491–1607" },
    { code: "P2", name: "Period 2: 1607–1754" },
    { code: "P3", name: "Period 3: 1754–1800" },
    { code: "P4", name: "Period 4: 1800–1848" },
    { code: "P5", name: "Period 5: 1844–1877" },
    { code: "P6", name: "Period 6: 1865–1898" },
    { code: "P7", name: "Period 7: 1890–1945" },
    { code: "P8", name: "Period 8: 1945–1980" },
    { code: "P9", name: "Period 9: 1980–Present" },
  ],
  APEURO: [
    { code: "RE", name: "Renaissance and Exploration" },
    { code: "AR", name: "Age of Reformation" },
    { code: "AC", name: "Absolutism and Constitutionalism" },
    { code: "SPP", name: "Scientific, Philosophical, Political Developments" },
    { code: "CRR", name: "Conflict, Revolution, and Reaction" },
    { code: "IND", name: "Industrialization and Its Effects" },
    { code: "NPP", name: "19th Century Perspectives and Political Developments" },
    { code: "GCF", name: "20th Century Global Conflicts" },
    { code: "CCE", name: "Cold War and Contemporary Europe" },
  ],
  APWORLD: [
    { code: "U0", name: "Unit 0: Foundations" },
    { code: "U1", name: "Unit 1" },
    { code: "U2", name: "Unit 2" },
    { code: "U3", name: "Unit 3" },
    { code: "U4", name: "Unit 4" },
    { code: "U5", name: "Unit 5" },
    { code: "U6", name: "Unit 6" },
    { code: "U7", name: "Unit 7" },
    { code: "U8", name: "Unit 8" },
    { code: "U9", name: "Unit 9" },
  ],
  APCSA: [
    { code: "U1", name: "Using Objects and Methods" },
    { code: "U2", name: "Selection and Iteration" },
    { code: "U3", name: "Class Creation" },
    { code: "U4", name: "Data Collections" },
  ],
  APPHYS1: [
    { code: "KIN", name: "Kinematics" },
    { code: "FTD", name: "Force and Translational Dynamics" },
    { code: "WEP", name: "Work, Energy, and Power" },
    { code: "LMO", name: "Linear Momentum" },
    { code: "TRD", name: "Torque and Rotational Dynamics" },
    { code: "EMR", name: "Energy and Momentum of Rotating Systems" },
    { code: "OSC", name: "Oscillations" },
    { code: "FLU", name: "Fluids" },
  ],
  APPHYS2: [
    { code: "THD", name: "Thermodynamics" },
    { code: "EFP", name: "Electric Force, Field, and Potential" },
    { code: "EC", name: "Electric Circuits" },
    { code: "MEI", name: "Magnetism and Electromagnetism" },
    { code: "GPO", name: "Geometric Optics" },
    { code: "WPO", name: "Waves, Sound, and Physical Optics" },
    { code: "MOD", name: "Modern Physics" },
  ],
};

export const SUBJECT_SECTION_CODES: Record<string, string[]> = Object.fromEntries(
  Object.entries(SUBJECT_SECTIONS).map(([subject, sections]) => [
    subject,
    sections.map((s) => s.code),
  ]),
);

