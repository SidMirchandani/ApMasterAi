import type { Firestore } from "firebase-admin/firestore";
import { AggregateField } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "./firebase-admin";
import { isInternationalInferredState } from "./inferred-region";

const CACHE_TTL_MS = 5 * 60 * 1000;

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
    if (isInternationalInferredState(st)) continue;
    const key =
      typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim()) ? st.trim().toUpperCase() : "Unknown";
    usersByStateMap[key] = (usersByStateMap[key] || 0) + 1;
  }
  return Object.entries(usersByStateMap).filter(
    ([code, n]) => code !== "Unknown" && /^[A-Z]{2}$/.test(code) && n > 0,
  ).length;
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

  const [
    totalStudents,
    totalSubjectEnrollments,
    questionBank,
    usersStateSnap,
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
    firestore
      .collection("questions")
      .count()
      .get()
      .then((s) => s.data().count),
    firestore.collection("users").select("inferredState").get(),
    aggregateCollectionGroupCount(firestore, "fullLengthTests"),
    aggregateCollectionGroupCount(firestore, "diagnosticTests"),
    aggregateCollectionGroupCount(firestore, "unitQuizResults"),
    aggregateStudentQuestionAttempts(firestore),
  ]);

  const statesWithUsers = countStatesFromUsersSnapshot(usersStateSnap.docs);
  const totalQuizzesTaken = fullLengthQuizCount + diagnosticQuizCount + unitQuizCount;

  const data: PlatformPublicStats = {
    totalStudents,
    totalSubjectEnrollments,
    questionBank,
    statesWithUsers,
    totalQuizzesTaken,
    totalQuestionsAnswered,
    computedAt: new Date().toISOString(),
  };

  memoryCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
