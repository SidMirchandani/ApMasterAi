import type { DocumentReference, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import pLimit from "p-limit";
import { computeProjectedAPScore } from "./diagnostic-grading";
import { getApiCodeForSubject } from "./subjects-helper";

export type ApScoreLiftBySubject = {
  subjectId: string;
  averageLift: number;
  /** Enrollments with a computable lift for this subject */
  count: number;
};

const CONCURRENCY = 12;

async function getLatestPredictedScore(
  firestore: Firestore,
  userId: string,
  subjectId: string,
  enrollmentRef: DocumentReference
): Promise<number | null> {
  const hist = await firestore
    .collection("score_history")
    .where("userId", "==", userId)
    .where("subjectId", "==", subjectId)
    .get();

  let bestAttempted = -1;
  let bestScore: number | null = null;
  for (const d of hist.docs) {
    const data = d.data();
    const ta = typeof data.totalAttempted === "number" ? data.totalAttempted : 0;
    const ps = data.predictedScore;
    if (typeof ps === "number" && ta >= bestAttempted) {
      bestAttempted = ta;
      bestScore = ps;
    }
  }
  if (bestScore != null) return bestScore;

  const flSnap = await enrollmentRef.collection("fullLengthTests").orderBy("date", "desc").limit(1).get();
  if (flSnap.empty) return null;
  const fl = flSnap.docs[0].data();
  const pct = typeof fl.percentage === "number" ? fl.percentage : 0;
  const apiCode = getApiCodeForSubject(subjectId) || subjectId;
  return computeProjectedAPScore(apiCode, pct / 100).projectedScore;
}

async function improvementForEnrollment(
  firestore: Firestore,
  doc: QueryDocumentSnapshot
): Promise<number | null> {
  const data = doc.data();
  const userId = data.userId as string | undefined;
  const subjectId = data.subjectId as string | undefined;
  if (!userId || !subjectId) return null;

  const firstDiag = await doc.ref.collection("diagnosticTests").orderBy("date", "asc").limit(1).get();
  if (firstDiag.empty) return null;
  const firstScore = firstDiag.docs[0].data().projectedScore;
  if (typeof firstScore !== "number") return null;

  const latest = await getLatestPredictedScore(firestore, userId, subjectId, doc.ref);
  if (latest == null || typeof latest !== "number") return null;
  if (latest < firstScore) return null;
  return latest - firstScore;
}

/**
 * Overall average lift and per-subject averages (same enrollment criteria as overall).
 */
export async function computeApScoreLiftBreakdown(
  firestore: Firestore,
  enrollmentDocs: QueryDocumentSnapshot[]
): Promise<{ average: number | null; bySubject: ApScoreLiftBySubject[] }> {
  if (enrollmentDocs.length === 0) return { average: null, bySubject: [] };
  const limit = pLimit(CONCURRENCY);
  const rows = await Promise.all(
    enrollmentDocs.map((doc) =>
      limit(async () => {
        const data = doc.data();
        const subjectIdRaw = data.subjectId as string | undefined;
        if (!subjectIdRaw) return null;
        const subjectId = getApiCodeForSubject(subjectIdRaw) ?? subjectIdRaw.toUpperCase();
        const delta = await improvementForEnrollment(firestore, doc);
        if (delta == null) return null;
        return { subjectId, delta };
      })
    )
  );
  const improvements: number[] = [];
  const bySubjectDeltas: Record<string, number[]> = {};
  for (const row of rows) {
    if (!row) continue;
    improvements.push(row.delta);
    (bySubjectDeltas[row.subjectId] ??= []).push(row.delta);
  }
  const average =
    improvements.length > 0
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length
      : null;
  const bySubject = Object.entries(bySubjectDeltas)
    .map(([subjectId, lifts]) => ({
      subjectId,
      averageLift: lifts.reduce((a, b) => a + b, 0) / lifts.length,
      count: lifts.length,
    }))
    .sort((a, b) => b.averageLift - a.averageLift);
  return { average, bySubject };
}

/**
 * Average AP score lift (1–5 scale points) per enrollment that has a first diagnostic and a later score signal.
 */
export async function computeAverageApScoreLift(
  firestore: Firestore,
  enrollmentDocs: QueryDocumentSnapshot[]
): Promise<number | null> {
  const { average } = await computeApScoreLiftBreakdown(firestore, enrollmentDocs);
  return average;
}
