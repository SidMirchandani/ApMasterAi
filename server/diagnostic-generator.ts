/**
 * 35-question diagnostic: capped pool (max 150) + three-phase generator.
 * Phase A: 3 per unit (1 Easy, 1 Medium, 1 Hard). Phase B: remainder by priority. Phase C: extras prefer Medium/Hard.
 */

import type FirebaseFirestore from "firebase-admin/firestore";
import { getDiagnostic35Distribution, getDiagnosticPoolCaps } from "./ap-subject-config";
import { getDifficultyTier } from "./difficulty";

const DIAGNOSTIC_POOL_CAP = 150;
const BASELINE_PER_UNIT = 3;

export interface DiagnosticQuestion {
  id: string;
  [key: string]: unknown;
}

export type DiagnosticPool = Record<
  string,
  { easy: DiagnosticQuestion[]; medium: DiagnosticQuestion[]; hard: DiagnosticQuestion[] }
>;

/** Section code -> list of section_code values to query (e.g. AP CSA U1 -> ["U1","PT","UO"]) */
export type SectionQueryMap = Record<string, string[]>;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickOne<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

/**
 * Build a capped diagnostic pool: max 150 questions total, split by unit (weight-proportional caps),
 * within each unit roughly equal easy/medium/hard. Uses one query per unit with limit(cap), then buckets by difficulty in memory.
 */
export async function buildCappedPool(
  db: FirebaseFirestore.Firestore,
  subjectCode: string,
  options: { sectionQueryMap?: SectionQueryMap; maxTotal?: number } = {}
): Promise<DiagnosticPool> {
  const { sectionQueryMap = {}, maxTotal = DIAGNOSTIC_POOL_CAP } = options;
  const caps = getDiagnosticPoolCaps(subjectCode);
  if (!caps) return {};

  const questionsRef = db.collection("questions");
  const pool: DiagnosticPool = {};

  for (const [sectionCode, cap] of Object.entries(caps)) {
    const sectionCodesToQuery =
      sectionQueryMap[sectionCode] && sectionQueryMap[sectionCode].length > 0
        ? sectionQueryMap[sectionCode]
        : [sectionCode];

    const snapshot =
      sectionCodesToQuery.length === 1
        ? await questionsRef
            .where("subject_code", "==", subjectCode)
            .where("section_code", "==", sectionCode)
            .limit(cap)
            .get()
        : await questionsRef
            .where("subject_code", "==", subjectCode)
            .where("section_code", "in", sectionCodesToQuery)
            .limit(cap)
            .get();

    const questions = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown> & { tags?: string[]; difficulty?: string };
      return { id: doc.id, ...data, tags: data.tags ?? [] } as DiagnosticQuestion;
    });

    const easy: DiagnosticQuestion[] = [];
    const medium: DiagnosticQuestion[] = [];
    const hard: DiagnosticQuestion[] = [];
    for (const q of questions) {
      const tier = getDifficultyTier(q);
      if (tier === "easy") easy.push(q);
      else if (tier === "medium") medium.push(q);
      else hard.push(q);
    }

    pool[sectionCode] = {
      easy: shuffle(easy),
      medium: shuffle(medium),
      hard: shuffle(hard),
    };
  }

  return pool;
}

/**
 * From a unit's buckets, take one question from each tier (E, M, H) for Phase A.
 * If a tier is empty, fill from another tier so we still get 3 questions. Mutates arrays by removing chosen.
 */
function takeBaselineThree(
  easy: DiagnosticQuestion[],
  medium: DiagnosticQuestion[],
  hard: DiagnosticQuestion[]
): DiagnosticQuestion[] {
  const chosen: DiagnosticQuestion[] = [];
  const take = (arr: DiagnosticQuestion[]): DiagnosticQuestion | undefined => arr.shift();
  chosen.push(take(easy) ?? take(medium) ?? take(hard));
  chosen.push(take(medium) ?? take(easy) ?? take(hard));
  chosen.push(take(hard) ?? take(medium) ?? take(easy));
  return chosen.filter((q): q is DiagnosticQuestion => q != null);
}

/**
 * From a unit's remaining buckets, take `count` questions preferring Medium then Hard then Easy. No duplicates from usedIds.
 */
function takeExtrasPreferMediumHard(
  easy: DiagnosticQuestion[],
  medium: DiagnosticQuestion[],
  hard: DiagnosticQuestion[],
  count: number,
  usedIds: Set<string>
): DiagnosticQuestion[] {
  const candidates = [
    ...medium.filter((q) => !usedIds.has(q.id)),
    ...hard.filter((q) => !usedIds.has(q.id)),
    ...easy.filter((q) => !usedIds.has(q.id)),
  ];
  const chosen: DiagnosticQuestion[] = [];
  for (let i = 0; i < count && i < candidates.length; i++) {
    chosen.push(candidates[i]);
    usedIds.add(candidates[i].id);
  }
  return chosen;
}

/**
 * Generate exactly `target` diagnostic questions from the capped pool using Phase A (3 per unit), then extras by priority (Phase B/C).
 */
export function generateDiagnosticTest(
  pool: DiagnosticPool,
  subjectCode: string,
  target: number = 35
): DiagnosticQuestion[] {
  const distribution = getDiagnostic35Distribution(subjectCode);
  if (!distribution) return [];

  const unitCodes = Object.keys(distribution);
  const allSelected: DiagnosticQuestion[] = [];
  const usedIds = new Set<string>();

  // Clone pool buckets so we can mutate (remove chosen)
  const buckets: Record<
    string,
    { easy: DiagnosticQuestion[]; medium: DiagnosticQuestion[]; hard: DiagnosticQuestion[] }
  > = {};
  for (const [sectionCode, b] of Object.entries(pool)) {
    buckets[sectionCode] = {
      easy: [...b.easy],
      medium: [...b.medium],
      hard: [...b.hard],
    };
  }

  for (const sectionCode of unitCodes) {
    const count = distribution[sectionCode] ?? 0;
    if (count <= 0) continue;

    const b = buckets[sectionCode];
    if (!b) continue;

    // Phase A: 3 baseline (1E, 1M, 1H)
    const baseline = takeBaselineThree(b.easy, b.medium, b.hard);
    for (const q of baseline) {
      allSelected.push(q);
      usedIds.add(q.id);
    }

    // Phase B/C: (count - 3) extras, preferring Medium/Hard
    const extraCount = count - BASELINE_PER_UNIT;
    if (extraCount > 0) {
      const extras = takeExtrasPreferMediumHard(
        b.easy,
        b.medium,
        b.hard,
        extraCount,
        usedIds
      );
      for (const q of extras) {
        allSelected.push(q);
      }
    }
  }

  const shuffled = shuffle(allSelected);
  return shuffled.slice(0, target);
}
