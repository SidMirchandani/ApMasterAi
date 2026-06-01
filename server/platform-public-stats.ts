import type { Firestore } from "firebase-admin/firestore";
import { AggregateField } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "./firebase-admin";
import { aggregateGlobalStatsFromUserStats } from "./user-stats";

const CACHE_TTL_MS = 5 * 60 * 1000;
const AGG_GEO_DOC_PATH = "insights_user_geo/current";

let memoryCache: { data: PlatformPublicStats; expiresAt: number } | null = null;

async function aggregateCollectionGroupCount(firestore: Firestore, collectionId: string): Promise<number> {
  try {
    const snap = await firestore.collectionGroup(collectionId).aggregate({ n: AggregateField.count() }).get();
    return Number(snap.data().n ?? 0);
  } catch (err) {
    console.error(`[platform-public-stats] collectionGroup "${collectionId}" count failed`, err);
    return 0;
  }
}

async function aggregateStudentQuestionAttempts(firestore: Firestore): Promise<number> {
  try {
    const snap = await firestore
      .collection("user_question_state")
      .aggregate({ s: AggregateField.sum("attemptCount") })
      .get();
    const v = snap.data().s;
    return typeof v === "number" && !Number.isNaN(v) ? v : 0;
  } catch (err) {
    console.error("[platform-public-stats] user_question_state sum(attemptCount) failed", err);
    return 0;
  }
}

function asNumberOrZero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export type PlatformPublicStats = {
  totalStudents: number;
  totalSubjectEnrollments: number;
  questionBank: number;
  statesWithUsers: number;
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  /** ISO timestamp when stats were computed */
  computedAt: string;
};

function countStatesFromUsersSnapshot(
  docs: Array<{ data: () => Record<string, unknown> }>,
): number {
  const usersByStateMap: Record<string, number> = {};
  for (const doc of docs) {
    const st = doc.data().inferredState;
    const key =
      typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim()) ? st.trim().toUpperCase() : "International";
    usersByStateMap[key] = (usersByStateMap[key] || 0) + 1;
  }
  return Object.entries(usersByStateMap).filter(
    ([code, n]) => code !== "International" && /^[A-Z]{2}$/.test(code) && n > 0,
  ).length;
}

function countStatesFromGeoAggregate(data: Record<string, unknown>): number | null {
  const explicitCount = asNumberOrZero(data.statesWithUsersCount);
  if (explicitCount > 0) return explicitCount;

  const stateCounts =
    asRecord(data.usersByState).stateCounts ??
    asRecord(data.usersByState).byState ??
    data.usersByState ??
    data.stateCounts;
  const byState = asRecord(stateCounts);
  const derivedCount = Object.entries(byState).filter(
    ([code, count]) =>
      code !== "International" &&
      /^[A-Z]{2}$/.test(code) &&
      asNumberOrZero(count) > 0,
  ).length;

  return derivedCount > 0 ? derivedCount : null;
}

async function readStatesWithUsersFromGeoAggregate(firestore: Firestore): Promise<number | null> {
  try {
    const snap = await firestore.doc(AGG_GEO_DOC_PATH).get();
    if (!snap.exists) return null;
    return countStatesFromGeoAggregate(snap.data() || {});
  } catch (err) {
    console.error("[platform-public-stats] geo aggregate read failed", err);
    return null;
  }
}

async function getStatesWithUsers(firestore: Firestore): Promise<number> {
  const aggregateCount = await readStatesWithUsersFromGeoAggregate(firestore);
  if (aggregateCount != null) return aggregateCount;

  const usersStateSnap = await firestore.collection("users").select("inferredState").get();
  return countStatesFromUsersSnapshot(usersStateSnap.docs);
}

/**
 * Same KPI definitions as admin insights (KPI strip), for public landing display.
 * Uses count/aggregate queries and a short in-memory cache so responses stay fast under load.
 */
export async function getPlatformPublicStats(): Promise<PlatformPublicStats> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.data;
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error("Firebase Admin not initialized");
  }
  const { firestore } = firebaseAdmin;

  const [rollupTotals, questionBank, statesWithUsers] = await Promise.all([
    aggregateGlobalStatsFromUserStats(firestore),
    firestore
      .collection("questions")
      .count()
      .get()
      .then((s) => s.data().count),
    getStatesWithUsers(firestore),
  ]);

  let legacyTotals: {
    totalStudents: number;
    totalSubjectEnrollments: number;
    totalQuizzesTaken: number;
    totalQuestionsAnswered: number;
  } | null = null;

  if (!rollupTotals) {
    const [
      totalStudentsLegacy,
      totalSubjectEnrollmentsLegacy,
      fullLengthQuizCount,
      diagnosticQuizCount,
      unitQuizCount,
      totalQuestionsAnswered,
    ] = await Promise.all([
      firestore
        .collection("users")
        .count()
        .get()
        .then((s) => s.data().count),
      firestore
        .collection("user_subjects")
        .count()
        .get()
        .then((s) => s.data().count),
      aggregateCollectionGroupCount(firestore, "fullLengthTests"),
      aggregateCollectionGroupCount(firestore, "diagnosticTests"),
      aggregateCollectionGroupCount(firestore, "unitQuizResults"),
      aggregateStudentQuestionAttempts(firestore),
    ]);
    legacyTotals = {
      totalStudents: totalStudentsLegacy,
      totalSubjectEnrollments: totalSubjectEnrollmentsLegacy,
      totalQuizzesTaken: fullLengthQuizCount + diagnosticQuizCount + unitQuizCount,
      totalQuestionsAnswered,
    };
  }

  const totals = rollupTotals ?? legacyTotals ?? {
    totalStudents: 0,
    totalSubjectEnrollments: 0,
    totalQuizzesTaken: 0,
    totalQuestionsAnswered: 0,
  };

  const data: PlatformPublicStats = {
    totalStudents: totals.totalStudents,
    totalSubjectEnrollments: totals.totalSubjectEnrollments,
    questionBank,
    statesWithUsers,
    totalQuizzesTaken: totals.totalQuizzesTaken,
    totalQuestionsAnswered: totals.totalQuestionsAnswered,
    computedAt: new Date().toISOString(),
  };

  memoryCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
