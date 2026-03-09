/**
 * AP Subject configurations for universal grading (projected AP score 1-5).
 * Used by diagnostic test grading and projected score calculation.
 */

export interface APSubjectConfig {
  subject_code: string;
  subject_name: string;
  max_composite_points: number;
  mcq_weight: number;
  frq_weight: number;
  frq_penalty_modifier: number;
  curve_thresholds: { "5": number; "4": number; "3": number; "2": number };
}

export const AP_SUBJECT_CONFIGS: APSubjectConfig[] = [
  {
    subject_code: "APMACRO",
    subject_name: "AP Macroeconomics",
    max_composite_points: 90,
    mcq_weight: 0.67,
    frq_weight: 0.33,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 72, "4": 59, "3": 47, "2": 35 },
  },
  {
    subject_code: "APMICRO",
    subject_name: "AP Microeconomics",
    max_composite_points: 90,
    mcq_weight: 0.67,
    frq_weight: 0.33,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 74, "4": 60, "3": 48, "2": 36 },
  },
  {
    subject_code: "APCSP",
    subject_name: "AP Computer Science Principles",
    max_composite_points: 100,
    mcq_weight: 0.7,
    frq_weight: 0.3,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 78, "4": 64, "3": 48, "2": 36 },
  },
  {
    subject_code: "APCSA",
    subject_name: "AP Computer Science A",
    max_composite_points: 80,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 62, "4": 47, "3": 37, "2": 27 },
  },
  {
    subject_code: "APCALCAB",
    subject_name: "AP Calculus AB",
    max_composite_points: 108,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 68, "4": 54, "3": 42, "2": 33 },
  },
  {
    subject_code: "APCALCBC",
    subject_name: "AP Calculus BC",
    max_composite_points: 108,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 68, "4": 56, "3": 44, "2": 35 },
  },
  {
    subject_code: "APUSH",
    subject_name: "AP U.S. History",
    max_composite_points: 130,
    mcq_weight: 0.4,
    frq_weight: 0.6,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 92, "4": 76, "3": 60, "2": 45 },
  },
  {
    subject_code: "APLANG",
    subject_name: "AP English Language and Composition",
    max_composite_points: 100,
    mcq_weight: 0.45,
    frq_weight: 0.55,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 79, "4": 69, "3": 59, "2": 42 },
  },
  {
    subject_code: "APBIO",
    subject_name: "AP Biology",
    max_composite_points: 120,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.8,
    curve_thresholds: { "5": 92, "4": 73, "3": 54, "2": 38 },
  },
  {
    subject_code: "APCHEM",
    subject_name: "AP Chemistry",
    max_composite_points: 100,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.8,
    curve_thresholds: { "5": 72, "4": 58, "3": 42, "2": 27 },
  },
  {
    subject_code: "APWORLD",
    subject_name: "AP World History: Modern",
    max_composite_points: 130,
    mcq_weight: 0.4,
    frq_weight: 0.6,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 92, "4": 75, "3": 58, "2": 43 },
  },
  {
    subject_code: "APPHYS1",
    subject_name: "AP Physics 1: Algebra-Based",
    max_composite_points: 90,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.8,
    curve_thresholds: { "5": 65, "4": 52, "3": 41, "2": 30 },
  },
  {
    subject_code: "APPHYS2",
    subject_name: "AP Physics 2: Algebra-Based",
    max_composite_points: 90,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.8,
    curve_thresholds: { "5": 66, "4": 54, "3": 42, "2": 31 },
  },
  {
    subject_code: "APPSYCH",
    subject_name: "AP Psychology",
    max_composite_points: 150,
    mcq_weight: 0.67,
    frq_weight: 0.33,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 113, "4": 93, "3": 77, "2": 65 },
  },
  {
    subject_code: "APGOV",
    subject_name: "AP U.S. Government and Politics",
    max_composite_points: 120,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 88, "4": 72, "3": 54, "2": 36 },
  },
  {
    subject_code: "APEURO",
    subject_name: "AP European History",
    max_composite_points: 130,
    mcq_weight: 0.4,
    frq_weight: 0.6,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 90, "4": 74, "3": 57, "2": 43 },
  },
  {
    subject_code: "APLIT",
    subject_name: "AP English Literature and Composition",
    max_composite_points: 100,
    mcq_weight: 0.45,
    frq_weight: 0.55,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 77, "4": 66, "3": 52, "2": 38 },
  },
  {
    subject_code: "APSTATS",
    subject_name: "AP Statistics",
    max_composite_points: 100,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.85,
    curve_thresholds: { "5": 70, "4": 57, "3": 44, "2": 32 },
  },
  {
    subject_code: "APES",
    subject_name: "AP Environmental Science",
    max_composite_points: 150,
    mcq_weight: 0.6,
    frq_weight: 0.4,
    frq_penalty_modifier: 0.8,
    curve_thresholds: { "5": 108, "4": 87, "3": 68, "2": 55 },
  },
  {
    subject_code: "APHUG",
    subject_name: "AP Human Geography",
    max_composite_points: 120,
    mcq_weight: 0.5,
    frq_weight: 0.5,
    frq_penalty_modifier: 0.75,
    curve_thresholds: { "5": 84, "4": 68, "3": 54, "2": 40 },
  },
];

const configByCode = new Map<string, APSubjectConfig>(
  AP_SUBJECT_CONFIGS.map((c) => [c.subject_code, c])
);

// Client/DB may use APWH for World History; grading config is APWORLD
const APWH_CONFIG = AP_SUBJECT_CONFIGS.find((c) => c.subject_code === "APWORLD");
if (APWH_CONFIG) configByCode.set("APWH", APWH_CONFIG);

export function getAPSubjectConfig(subjectCode: string): APSubjectConfig | null {
  return configByCode.get(subjectCode) ?? null;
}

/**
 * Convert a raw percentage (0–100) to an AP score (1–5) using the subject's
 * max_composite_points and curve_thresholds. Returns null if subject is not in config.
 */
export function percentageToAPScore(percentage: number, subjectCode: string | undefined): number | null {
  if (subjectCode == null) return null;
  const config = configByCode.get(subjectCode) ?? null;
  if (!config) return null;
  const estimatedComposite = (percentage / 100) * config.max_composite_points;
  const th = config.curve_thresholds;
  if (estimatedComposite >= th["5"]) return 5;
  if (estimatedComposite >= th["4"]) return 4;
  if (estimatedComposite >= th["3"]) return 3;
  if (estimatedComposite >= th["2"]) return 2;
  return 1;
}

/**
 * Unit/section weights for diagnostic test question distribution (20 questions).
 * Subjects in EXAM_WEIGHTS (questions.ts) are used there; this map adds subjects
 * that are in AP_SUBJECT_CONFIGS but not in EXAM_WEIGHTS, using unit IDs and
 * midpoints of exam weight ranges.
 */
export const DIAGNOSTIC_UNIT_WEIGHTS: Record<string, Record<string, number>> = {
  APCSA: {
    U1: 20,
    U2: 30,
    U3: 14,
    U4: 35,
  },
  APCALCAB: {
    LIM: 11,
    DDF: 11,
    DCI: 11,
    CAD: 12.5,
    AAD: 16.5,
    IAC: 18.5,
    DE: 9,
    AI: 12.5,
  },
  APCALCBC: {
    LIM: 5.5,
    DDF: 5.5,
    DCI: 5.5,
    CAD: 7.5,
    AAD: 9.5,
    IAC: 18.5,
    DE: 7.5,
    AI: 7.5,
    PPV: 11.5,
    ISS: 17.5,
  },
  APUSH: {
    P1: 5,
    P2: 7,
    P3: 13.5,
    P4: 13.5,
    P5: 13.5,
    P6: 13.5,
    P7: 13.5,
    P8: 13.5,
    P9: 5,
  },
  APLANG: {
    CRE: 22.5,
    SS: 22.5,
    RS: 22.5,
    OC: 17.5,
    ARG: 17.5,
  },
  APBIO: {
    CL: 9.5,
    CSF: 11.5,
    CE: 14,
    CCC: 12.5,
    HER: 9.5,
    GER: 14,
    NS: 16.5,
    ECO: 12.5,
  },
  APCHEM: {
    ASP: 8,
    MIS: 8,
    IMF: 20,
    RXN: 8,
    KIN: 8,
    THERMO: 8,
    EQM: 8,
    ACB: 13,
    ATD: 8,
  },
  APWORLD: {
    GT: 9,
    NE: 9,
    LBE: 13.5,
    TI: 13.5,
    REV: 13.5,
    COI: 13.5,
    GC: 9,
    CWD: 9,
    GLO: 9,
  },
  APWH: {
    GT: 9,
    NE: 9,
    LBE: 13.5,
    TI: 13.5,
    REV: 13.5,
    COI: 13.5,
    GC: 9,
    CWD: 9,
    GLO: 9,
  },
  APPHYS1: {
    KIN: 12.5,
    FTD: 20.5,
    WEP: 20.5,
    LMO: 12.5,
    TRD: 12.5,
    EMR: 6.5,
    OSC: 6.5,
    FLU: 12.5,
  },
  APPHYS2: {
    THD: 14,
    EFP: 14,
    EC: 15,
    MEI: 14,
    GPO: 15,
    WPO: 14,
    MOD: 14,
  },
  APPSYCH: {
    BIO: 20,
    COG: 20,
    DEV: 20,
    SOC: 20,
    MPH: 20,
  },
  APMACRO: {
    BEC: 5,
    EIBC: 12,
    NIPD: 17,
    FS: 18,
    LRCSP: 20,
    OEITF: 10,
  },
  APMICRO: {
    BEC: 13.5,
    SD: 22.5,
    PC: 23.5,
    IMP: 18.5,
    FM: 11.5,
    MF: 10.5,
  },
  APCSP: {
    CRD: 11.5,
    DAT: 19.5,
    AAP: 32.5,
    CSN: 13,
    IOC: 23.5,
  },
  APGOV: {
    FAD: 18.5,
    IAB: 30.5,
    CLCR: 15.5,
    APIB: 12.5,
    PP: 23.5,
  },
};

export function getDiagnosticWeightsForSubject(subjectCode: string): Record<string, number> | null {
  return DIAGNOSTIC_UNIT_WEIGHTS[subjectCode] ?? null;
}

/**
 * Exact question counts per unit/section for the 25-question adaptive diagnostic.
 * Derived from DIAGNOSTIC_UNIT_WEIGHTS using proportional rounding to sum = 25.
 * Per-subject spec from product: APCSA [5,8,4,8], APCALCAB [3,3,3,3,3,3,4,3],
 * APCALCBC [2,2,2,2,2,2,3,3,4,3], APUSH [3,3,3,3,3,3,3,3,3], APPSYCH [5,5,5,5,5].
 */
export const DIAGNOSTIC_UNIT_DISTRIBUTIONS: Record<string, Record<string, number>> = {
  APCSA:     { U1: 5,  U2: 8,  U3: 4,  U4: 8 },
  APCALCAB:  { LIM: 3, DDF: 3, DCI: 3, CAD: 3, AAD: 3, IAC: 3, DE: 4, AI: 3 },
  APCALCBC:  { LIM: 2, DDF: 2, DCI: 2, CAD: 2, AAD: 2, IAC: 2, DE: 3, AI: 3, PPV: 4, ISS: 3 },
  APUSH:     { P1: 3,  P2: 3,  P3: 3,  P4: 3,  P5: 3,  P6: 3,  P7: 3,  P8: 3,  P9: 3 },
  APPSYCH:   { BIO: 5, COG: 5, DEV: 5, SOC: 5, MPH: 5 },
  APLANG:    { CRE: 6, SS: 6, RS: 6, OC: 4, ARG: 3 },
  APBIO:     { CL: 3, CSF: 3, CE: 4, CCC: 3, HER: 3, GER: 3, NS: 4, ECO: 2 },
  APCHEM:    { ASP: 2, MIS: 2, IMF: 5, RXN: 2, KIN: 2, THERMO: 2, EQM: 2, ACB: 4, ATD: 4 },
  APCSP:     { CRD: 3, DAT: 5, AAP: 8, CSN: 4, IOC: 5 },
  APMACRO:   { BEC: 2, EIBC: 4, NIPD: 5, FS: 5, LRCSP: 6, OEITF: 3 },
  APMICRO:   { BEC: 3, SD: 5, PC: 6, IMP: 5, FM: 3, MF: 3 },
  APGOV:     { FAD: 5, IAB: 7, CLCR: 4, APIB: 3, PP: 6 },
  APWH:      { GT: 3, NE: 3, LBE: 3, TI: 3, REV: 4, COI: 3, GC: 2, CWD: 2, GLO: 2 },
  APWORLD:   { GT: 3, NE: 3, LBE: 3, TI: 3, REV: 4, COI: 3, GC: 2, CWD: 2, GLO: 2 },
  APPHYS1:   { KIN: 3, FTD: 5, WEP: 5, LMO: 3, TRD: 3, EMR: 2, OSC: 2, FLU: 2 },
  APPHYS2:   { THD: 4, EFP: 4, EC: 4, MEI: 3, GPO: 4, WPO: 3, MOD: 3 },
};

/**
 * Returns exact per-section question counts for a 25-question adaptive diagnostic.
 * Falls back to proportionally scaling DIAGNOSTIC_UNIT_WEIGHTS if subject not in distribution map.
 */
export function getDiagnosticDistributionForSubject(subjectCode: string): Record<string, number> | null {
  if (DIAGNOSTIC_UNIT_DISTRIBUTIONS[subjectCode]) {
    return DIAGNOSTIC_UNIT_DISTRIBUTIONS[subjectCode];
  }
  // Fallback: proportionally scale existing weights to sum=25
  const weights = DIAGNOSTIC_UNIT_WEIGHTS[subjectCode];
  if (!weights) return null;
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const entries = Object.entries(weights);
  const counts: Record<string, number> = {};
  let remaining = 25;
  entries.forEach(([code, weight], i) => {
    const n = i === entries.length - 1
      ? remaining
      : Math.max(1, Math.round((weight / totalWeight) * 25));
    counts[code] = n;
    remaining -= n;
  });
  return counts;
}
