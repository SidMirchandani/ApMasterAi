import { AggregateField, FieldValue } from "firebase-admin/firestore";
import type { DocumentData, Firestore } from "firebase-admin/firestore";

export const USER_STATS_COLLECTION = "user_stats";

type UserStatsDoc = {
  userId: string;
  coursesEnrolledTotal: number;
  questionsAnsweredTotal: number;
  quizzesTakenTotal: number;
  coursesBySubject: Record<string, number>;
  questionsBySubject: Record<string, number>;
  quizzesBySubject: Record<string, number>;
  updatedAt: string;
  version: number;
};

function subjectPath(prefix: "coursesBySubject" | "questionsBySubject" | "quizzesBySubject", subjectId: string): string {
  return `${prefix}.${subjectId}`;
}

async function ensureBaseDoc(firestore: Firestore, userId: string): Promise<void> {
  const ref = firestore.collection(USER_STATS_COLLECTION).doc(userId);
  const snap = await ref.get();
  if (snap.exists) return;
  const base: UserStatsDoc = {
    userId,
    coursesEnrolledTotal: 0,
    questionsAnsweredTotal: 0,
    quizzesTakenTotal: 0,
    coursesBySubject: {},
    questionsBySubject: {},
    quizzesBySubject: {},
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  await ref.set(base, { merge: true });
}

export async function incrementCourseEnrollment(firestore: Firestore, userId: string, subjectId: string): Promise<void> {
  await ensureBaseDoc(firestore, userId);
  await firestore.collection(USER_STATS_COLLECTION).doc(userId).set(
    {
      userId,
      coursesEnrolledTotal: FieldValue.increment(1),
      [subjectPath("coursesBySubject", subjectId)]: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    { merge: true },
  );
}

export async function decrementCourseEnrollment(firestore: Firestore, userId: string, subjectId: string): Promise<void> {
  await ensureBaseDoc(firestore, userId);
  const ref = firestore.collection(USER_STATS_COLLECTION).doc(userId);
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.data() || {}) as Partial<UserStatsDoc>;
    const total = Math.max(0, Number(data.coursesEnrolledTotal || 0) - 1);
    const bySubject = { ...(data.coursesBySubject || {}) };
    const current = Math.max(0, Number(bySubject[subjectId] || 0) - 1);
    bySubject[subjectId] = current;
    tx.set(
      ref,
      {
        userId,
        coursesEnrolledTotal: total,
        coursesBySubject: bySubject,
        updatedAt: new Date().toISOString(),
        version: 1,
      },
      { merge: true },
    );
  });
}

export async function incrementQuestionAnswered(
  firestore: Firestore,
  userId: string,
  subjectId: string,
  amount = 1,
): Promise<void> {
  if (amount <= 0) return;
  await ensureBaseDoc(firestore, userId);
  await firestore.collection(USER_STATS_COLLECTION).doc(userId).set(
    {
      userId,
      questionsAnsweredTotal: FieldValue.increment(amount),
      [subjectPath("questionsBySubject", subjectId)]: FieldValue.increment(amount),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    { merge: true },
  );
}

export async function incrementQuizTaken(
  firestore: Firestore,
  userId: string,
  subjectId: string,
  amount = 1,
): Promise<void> {
  if (amount <= 0) return;
  await ensureBaseDoc(firestore, userId);
  await firestore.collection(USER_STATS_COLLECTION).doc(userId).set(
    {
      userId,
      quizzesTakenTotal: FieldValue.increment(amount),
      [subjectPath("quizzesBySubject", subjectId)]: FieldValue.increment(amount),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    { merge: true },
  );
}

export async function getUserStatsBatch(
  firestore: Firestore,
  userIds: string[],
): Promise<Map<string, Partial<UserStatsDoc>>> {
  const out = new Map<string, Partial<UserStatsDoc>>();
  if (!userIds.length) return out;
  const refs = userIds.map((id) => firestore.collection(USER_STATS_COLLECTION).doc(id));
  const snaps = await firestore.getAll(...refs);
  for (const snap of snaps) {
    if (snap.exists) out.set(snap.id, snap.data() as Partial<UserStatsDoc>);
  }
  return out;
}

export async function getUserStatsDoc(
  firestore: Firestore,
  userId: string,
): Promise<Partial<UserStatsDoc> | null> {
  const snap = await firestore.collection(USER_STATS_COLLECTION).doc(userId).get();
  return snap.exists ? (snap.data() as Partial<UserStatsDoc>) : null;
}

export async function recomputeUserStatsForUser(
  firestore: Firestore,
  userId: string,
  options?: { persist?: boolean },
): Promise<Partial<UserStatsDoc>> {
  const userSubjectsSnap = await firestore.collection("user_subjects").where("userId", "==", userId).get();
  const coursesBySubject: Record<string, number> = {};
  for (const doc of userSubjectsSnap.docs) {
    const sid = String(doc.data().subjectId || "").toUpperCase();
    if (!sid) continue;
    coursesBySubject[sid] = (coursesBySubject[sid] || 0) + 1;
  }
  const coursesEnrolledTotal = userSubjectsSnap.size;

  const questionStateSnap = await firestore.collection("user_question_state").where("userId", "==", userId).get();
  const questionsBySubject: Record<string, number> = {};
  let questionsAnsweredTotal = 0;
  for (const doc of questionStateSnap.docs) {
    const data = doc.data();
    const sid = String(data.subjectId || "").toUpperCase();
    const attempts = Math.max(0, Number(data.attemptCount || 0));
    questionsAnsweredTotal += attempts;
    if (sid) questionsBySubject[sid] = (questionsBySubject[sid] || 0) + attempts;
  }

  const quizzesBySubject: Record<string, number> = {};
  let quizzesTakenTotal = 0;
  for (const subjectDoc of userSubjectsSnap.docs) {
    const sid = String(subjectDoc.data().subjectId || "").toUpperCase();
    const [fullLen, diag, unit] = await Promise.all([
      subjectDoc.ref.collection("fullLengthTests").count().get(),
      subjectDoc.ref.collection("diagnosticTests").count().get(),
      subjectDoc.ref.collection("unitQuizResults").count().get(),
    ]);
    const n = Number(fullLen.data().count || 0) + Number(diag.data().count || 0) + Number(unit.data().count || 0);
    quizzesTakenTotal += n;
    if (sid) quizzesBySubject[sid] = (quizzesBySubject[sid] || 0) + n;
  }

  const payload: Partial<UserStatsDoc> = {
    userId,
    coursesEnrolledTotal,
    questionsAnsweredTotal,
    quizzesTakenTotal,
    coursesBySubject,
    questionsBySubject,
    quizzesBySubject,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  if (options?.persist !== false) {
    await firestore.collection(USER_STATS_COLLECTION).doc(userId).set(payload, { merge: true });
  }
  return payload;
}

/** Firestore `users/{uid}` — set by admin backfill; skips recompute while true. */
export const USER_STATS_USER_BACKFILLED_FIELD = "userStatsBackfilled" as const;
export const USER_STATS_USER_BACKFILLED_AT_FIELD = "userStatsBackfilledAt" as const;

export function userHasUserStatsBackfillComplete(data: DocumentData | undefined): boolean {
  return data?.[USER_STATS_USER_BACKFILLED_FIELD] === true;
}

export async function aggregateGlobalStatsFromUserStats(firestore: Firestore): Promise<{
  totalStudents: number;
  totalSubjectEnrollments: number;
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
} | null> {
  try {
    const [countSnap, enrollSum, quizSum, questionSum] = await Promise.all([
      firestore.collection(USER_STATS_COLLECTION).count().get(),
      firestore.collection(USER_STATS_COLLECTION).aggregate({ s: AggregateField.sum("coursesEnrolledTotal") }).get(),
      firestore.collection(USER_STATS_COLLECTION).aggregate({ s: AggregateField.sum("quizzesTakenTotal") }).get(),
      firestore.collection(USER_STATS_COLLECTION).aggregate({ s: AggregateField.sum("questionsAnsweredTotal") }).get(),
    ]);
    return {
      totalStudents: Number(countSnap.data().count || 0),
      totalSubjectEnrollments: Number((enrollSum.data() as { s?: number }).s || 0),
      totalQuizzesTaken: Number((quizSum.data() as { s?: number }).s || 0),
      totalQuestionsAnswered: Number((questionSum.data() as { s?: number }).s || 0),
    };
  } catch {
    return null;
  }
}

