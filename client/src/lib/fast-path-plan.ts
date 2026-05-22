import {
  getUnitsForSubject,
  getSectionCodeForUnit,
  getSectionByCode,
  getUnitWeightsBySectionCode,
} from "@/subjects";
import {
  getPredictedAPScoreFromTests,
  getTargetPercentagesForSubject,
  type APScoreResult,
} from "@/lib/ap-score-utils";
import {
  FAST_PATH_COPY,
  getFastPathHeadline,
  getFastPathScoreTier,
} from "@/lib/fast-path-copy";

export const PHASE1_SIZE = 3;
export const PHASE2_SIZE = 5;
/** Questions per micro-drill round (max 25 per session = 5 rounds). */
export const MICRO_DRILL_QUESTIONS = 5;
export const MICRO_DRILL_SESSION_MAX = 25;
export const DEFAULT_MIN_PER_QUESTION = 1.5;

export interface FastPathTestEntry {
  percentage: number;
  type?: "full-length" | "diagnostic" | "unit";
  sectionBreakdown?: Record<string, { correct: number; total: number }>;
}

export interface UnitWithYield {
  unitId: string;
  sectionCode: string;
  name: string;
  unitNumber: number;
  weight: number;
  bestPct: number;
  pointsAvailable: number;
  masteryScore: number;
  mastered: boolean;
  yieldScore: number;
  unitDifficulty: number;
}

export interface FastPathPhases {
  phase1: UnitWithYield[];
  phase2: UnitWithYield[];
  phase3: UnitWithYield[];
  masteredUnits: UnitWithYield[];
  unmasteredByYield: UnitWithYield[];
}

export interface FastPathPlanInput {
  subjectId: string;
  subjectCode?: string;
  unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }>;
  testHistory: FastPathTestEntry[];
  unitDifficultiesMap?: Record<string, number>;
}

export interface FastPathPlanResult extends FastPathPhases {
  unitsWithYield: UnitWithYield[];
  currentPercentage: number;
  predicted: APScoreResult | null;
  gapTo4: number;
  gapTo5: number;
  target4: number;
  target5: number;
  hasEnoughForPrediction: boolean;
  hasDiagnostic: boolean;
}

export interface FastPathSummary {
  variant: "diagnostic" | "ready";
  headline: string;
  subline: string;
  secondaryLine?: string;
  href: string;
  minutesTo4: number;
  minutesTo5: number;
  phase1Count: number;
  topUnitName?: string;
  showSkipMasteredHint: boolean;
  pathNodesFilled: number;
  pathNodesTotal: number;
}

export function buildUnitBestMap(
  unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }>,
  testHistory: FastPathTestEntry[],
): Record<string, number> {
  const map: Record<string, number> = {};
  Object.entries(unitProgressMap).forEach(([code, prog]) => {
    map[code] = Math.max(map[code] ?? 0, prog.highestScore ?? prog.mcqScore ?? 0);
  });
  testHistory.forEach((test) => {
    if (test.sectionBreakdown) {
      Object.entries(test.sectionBreakdown).forEach(([code, section]) => {
        const pct =
          section.total > 0 ? Math.round((section.correct / section.total) * 100) : 0;
        map[code] = Math.max(map[code] ?? 0, pct);
      });
    }
  });
  return map;
}

export function buildUnitsWithYield(input: FastPathPlanInput): UnitWithYield[] {
  const { subjectId, unitProgressMap, testHistory, unitDifficultiesMap = {} } = input;
  const unitWeights = getUnitWeightsBySectionCode(subjectId);
  const units = getUnitsForSubject(subjectId);
  const unitBestMap = buildUnitBestMap(unitProgressMap, testHistory);

  return units
    .map((unit) => {
      const sectionCode = getSectionCodeForUnit(subjectId, unit.id) ?? "";
      const weight = unitWeights[sectionCode] ?? 0;
      const bestPct = unitBestMap[sectionCode] ?? 0;
      const masteryScore = bestPct / 100;
      const pointsAvailable = weight * (1 - masteryScore);
      const unitDifficulty = unitDifficultiesMap[sectionCode] ?? 1;
      const yieldScore = (weight * (1 - masteryScore)) / (unitDifficulty || 1);
      const sectionInfo = getSectionByCode(subjectId, sectionCode);
      const name = sectionInfo?.name ?? unit.title;
      const unitNumber = sectionInfo?.unitNumber ?? 0;
      const mastered = masteryScore > 0.85;
      return {
        unitId: unit.id,
        sectionCode,
        name,
        unitNumber,
        weight,
        bestPct,
        pointsAvailable,
        masteryScore,
        mastered,
        yieldScore,
        unitDifficulty,
      };
    })
    .filter((u) => u.sectionCode);
}

export function computeFastPathPhases(
  unitsWithYield: UnitWithYield[],
  predicted: APScoreResult | null,
  gapTo4: number,
): FastPathPhases {
  const masteredUnits = unitsWithYield.filter((u) => u.mastered);
  const unmasteredByYield = [...unitsWithYield.filter((u) => !u.mastered)].sort(
    (a, b) => b.yieldScore - a.yieldScore,
  );

  let phase1: UnitWithYield[] = [];
  if (predicted != null && predicted.score >= 4) {
    phase1 = unmasteredByYield.slice(0, 1);
  } else {
    let sum = 0;
    const result: UnitWithYield[] = [];
    for (const u of unmasteredByYield) {
      if (result.length >= PHASE1_SIZE) break;
      result.push(u);
      sum += u.pointsAvailable;
      if (sum >= gapTo4) break;
    }
    phase1 = result;
  }

  let phase2: UnitWithYield[] = [];
  if (predicted != null && predicted.score >= 4) {
    phase2 = unmasteredByYield.slice(phase1.length);
  } else {
    phase2 = unmasteredByYield.slice(phase1.length, phase1.length + PHASE2_SIZE);
  }

  const phase3 =
    predicted != null && predicted.score >= 4
      ? []
      : unmasteredByYield.slice(phase1.length + PHASE2_SIZE);

  return { phase1, phase2, phase3, masteredUnits, unmasteredByYield };
}

export function estimateMinutes(units: UnitWithYield[], drillsPerUnit = 1): number {
  const raw = units.length * drillsPerUnit * MICRO_DRILL_QUESTIONS * DEFAULT_MIN_PER_QUESTION;
  return Math.max(5, Math.ceil(raw / 5) * 5);
}

export function computeFastPathPlan(input: FastPathPlanInput): FastPathPlanResult {
  const { subjectId, subjectCode, testHistory } = input;
  const unitsWithYield = buildUnitsWithYield(input);
  const unitWeights = getUnitWeightsBySectionCode(subjectId);
  const { target4, target5 } = getTargetPercentagesForSubject(subjectCode);

  const currentPercentage =
    Object.keys(unitWeights).length === 0
      ? testHistory.length > 0
        ? Math.round(testHistory[testHistory.length - 1].percentage)
        : 0
      : Math.round(
          unitsWithYield.reduce((sum, u) => sum + (u.bestPct / 100) * u.weight, 0),
        );

  const hasEnoughForPrediction =
    testHistory.length > 0 || unitsWithYield.some((u) => u.bestPct > 0);
  const hasDiagnostic = testHistory.some((t) => t.type === "diagnostic");
  const predicted = getPredictedAPScoreFromTests(currentPercentage, subjectCode);
  const gapTo4 = Math.max(0, Math.round((target4 - currentPercentage) * 10) / 10);
  const gapTo5 = Math.max(0, Math.round((target5 - currentPercentage) * 10) / 10);

  const phases = computeFastPathPhases(unitsWithYield, predicted, gapTo4);

  return {
    unitsWithYield,
    currentPercentage,
    predicted,
    gapTo4,
    gapTo5,
    target4,
    target5,
    hasEnoughForPrediction,
    hasDiagnostic,
    ...phases,
  };
}

export function getFastPathSummary(
  plan: FastPathPlanResult,
  subjectId: string,
  diagnosticQuestionCount = 35,
): FastPathSummary {
  const { phase1, phase2, predicted, masteredUnits, hasEnoughForPrediction, hasDiagnostic } =
    plan;

  const minutesTo4 = estimateMinutes(phase1);
  const minutesTo5 =
    predicted != null && predicted.score >= 4
      ? estimateMinutes(phase2)
      : estimateMinutes([...phase1, ...phase2]);

  const topUnit = phase1[0];
  const pathNodesTotal = Math.min(3, Math.max(phase1.length, 1));
  const pathNodesFilled = phase1.filter((u) => u.bestPct > 0).length;

  const needsDiagnostic = !hasDiagnostic;

  if (needsDiagnostic) {
    return {
      variant: "diagnostic",
      headline: FAST_PATH_COPY.checkMyScore,
      subline: FAST_PATH_COPY.diagnosticSubline(diagnosticQuestionCount),
      secondaryLine: FAST_PATH_COPY.diagnosticPauseLine(diagnosticQuestionCount),
      href: `/diagnostic?subject=${subjectId}`,
      minutesTo4,
      minutesTo5,
      phase1Count: phase1.length,
      showSkipMasteredHint: false,
      pathNodesFilled: 0,
      pathNodesTotal: 3,
    };
  }

  const tier = getFastPathScoreTier(predicted);
  const headline = getFastPathHeadline(predicted);
  const n = phase1.length;
  const min =
    tier === "at5" ? estimateMinutes(phase1) : tier === "toward5" ? minutesTo5 : minutesTo4;
  const subline =
    tier === "at5"
      ? n <= 1 && topUnit
        ? FAST_PATH_COPY.practiceSublineSingle(topUnit.name, min)
        : FAST_PATH_COPY.maintainSubline(min)
      : n <= 1 && topUnit
        ? FAST_PATH_COPY.practiceSublineSingle(topUnit.name, min)
        : n > 1
          ? FAST_PATH_COPY.practiceSublineMulti(n, min)
          : `~${min} min`;

  return {
    variant: "ready",
    headline,
    subline,
    href: `/fast-path?subject=${subjectId}`,
    minutesTo4,
    minutesTo5,
    phase1Count: phase1.length,
    topUnitName: topUnit?.name,
    showSkipMasteredHint: masteredUnits.length >= 2,
    pathNodesFilled,
    pathNodesTotal,
  };
}
