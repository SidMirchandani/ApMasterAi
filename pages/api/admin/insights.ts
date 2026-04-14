import type { NextApiRequest, NextApiResponse } from "next";
import type { Firestore } from "firebase-admin/firestore";
import { AggregateField } from "firebase-admin/firestore";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectDisplayName, SUBJECT_DISPLAY_NAMES } from "../../../lib/subject-display-names";
import { getAllSubjectCodes, getApiCodeForSubject } from "../../../server/subjects-helper";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";
import { computeApScoreLiftBreakdown } from "../../../server/insights-score-lift";
import { runNjBackfillChunkIfNeeded } from "../../../server/nj-backfill-migration";

type RangeKey = "7d" | "30d" | "90d" | "all";

/** Chart date range: signups and daily counts start from Sep 1 (academic year) when range is "all". */
function getDateRange(range: string): { start: Date; end: Date } | null {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  switch (range as RangeKey) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "all": {
      const sep1 = new Date(end.getFullYear(), 8, 1);
      start.setTime(sep1.getTime());
      if (end < sep1) start.setFullYear(end.getFullYear() - 1);
      break;
    }
    default:
      return null;
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/** Best-effort enrollment timestamp from user_subjects (same fields as daily enrollment buckets). */
function parseEnrollmentCreated(data: Record<string, unknown>): Date | null {
  const raw =
    (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ||
    data.createdAt ||
    (data.enrolledAt as { toDate?: () => Date } | undefined)?.toDate?.() ||
    data.enrolledAt ||
    (data.created_at as { toDate?: () => Date } | undefined)?.toDate?.() ||
    data.created_at ||
    (data.dateAdded as { toDate?: () => Date } | undefined)?.toDate?.() ||
    data.dateAdded;
  if (raw == null) return null;
  const d = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getDatesBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Collection-group document count (quiz results under user_subjects). */
async function aggregateCollectionGroupCount(firestore: Firestore, collectionId: string): Promise<number> {
  try {
    const snap = await firestore.collectionGroup(collectionId).aggregate({ n: AggregateField.count() }).get();
    return Number(snap.data().n ?? 0);
  } catch (err) {
    console.error(`[admin/insights] collectionGroup "${collectionId}" count failed`, err);
    return 0;
  }
}

/** Sum of spaced-repetition attempt counts (each track call increments attemptCount). */
async function aggregateStudentQuestionAttempts(firestore: Firestore): Promise<number> {
  try {
    const snap = await firestore
      .collection("user_question_state")
      .aggregate({ s: AggregateField.sum("attemptCount") })
      .get();
    const v = snap.data().s;
    return typeof v === "number" && !Number.isNaN(v) ? v : 0;
  } catch (err) {
    console.error("[admin/insights] user_question_state sum(attemptCount) failed", err);
    return 0;
  }
}

/** Fast aggregates only — no full collection scans for users / user_subjects. */
async function buildSummaryData(firestore: Firestore) {
  const allCodes = getAllSubjectCodes();
  const [usersCountSnap, userSubjectsCountSnap, questionCountSnaps, quizBundle] = await Promise.all([
    firestore.collection("users").count().get(),
    firestore.collection("user_subjects").count().get(),
    Promise.all(
      allCodes.map((code) =>
        firestore.collection("questions").where("subject_code", "==", code).count().get(),
      ),
    ),
    Promise.all([
      aggregateCollectionGroupCount(firestore, "fullLengthTests"),
      aggregateCollectionGroupCount(firestore, "diagnosticTests"),
      aggregateCollectionGroupCount(firestore, "unitQuizResults"),
      aggregateStudentQuestionAttempts(firestore),
    ]),
  ]);

  let totalQuestionsAnswered = 0;
  for (const snap of questionCountSnaps) {
    totalQuestionsAnswered += snap.data().count || 0;
  }

  const totalStudents = usersCountSnap.data().count || 0;
  const totalSubjectsEnrolled = userSubjectsCountSnap.data().count || 0;
  const [fullLengthQuizCount, diagnosticQuizCount, unitQuizCount, totalStudentQuestionAttempts] = quizBundle;
  const totalQuizzesTaken = fullLengthQuizCount + diagnosticQuizCount + unitQuizCount;

  const activeUsersDAU = 0;
  const activeUsersMAU = totalStudents;

  return {
    totalStudents,
    activeUsersDAU,
    activeUsersMAU,
    totalSubjectsEnrolled,
    totalQuestionsAnswered,
    questionBankTotal: totalQuestionsAnswered,
    totalQuizzesTaken,
    totalStudentQuestionAttempts,
  };
}

/** Charts, geo, and score lift — requires full user and enrollment reads. */
async function buildAnalyticsData(firestore: Firestore, rangeParam: string) {
  const allCodes = getAllSubjectCodes();
  const [usersSnap, userSubjectsSnap, backfillSnap] = await Promise.all([
    firestore.collection("users").get(),
    firestore.collection("user_subjects").get(),
    firestore.collection("insights_enrollment_backfill").doc("default").get(),
  ]);

  const dateRange = getDateRange(rangeParam);

  const totalSubjectsEnrolled = userSubjectsSnap.size;
  const enrollmentsBySubject: Record<string, number> = {};
  const byDateEnrollments: Record<string, number> = {};
  userSubjectsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const rawId = data.subjectId || data.subject_id || "";
    if (!rawId) return;
    const canonicalCode = getApiCodeForSubject(rawId) ?? rawId.toUpperCase();
    const createdAt = parseEnrollmentCreated(data as Record<string, unknown>);
    const countTowardSubjectBar =
      dateRange == null ||
      (createdAt != null &&
        createdAt.getTime() >= dateRange.start.getTime() &&
        createdAt.getTime() <= dateRange.end.getTime());
    if (countTowardSubjectBar) {
      enrollmentsBySubject[canonicalCode] = (enrollmentsBySubject[canonicalCode] || 0) + 1;
    }
    if (createdAt) {
      const dateStr = createdAt.toISOString().slice(0, 10);
      byDateEnrollments[dateStr] = (byDateEnrollments[dateStr] || 0) + 1;
    }
  });

  const enrollmentSubjectCodes = allCodes.length > 0 ? allCodes : Object.keys(SUBJECT_DISPLAY_NAMES);
  const courseEnrollmentsDistribution = enrollmentSubjectCodes
    .map((subjectId) => ({
      subjectId,
      count: enrollmentsBySubject[subjectId] ?? 0,
      displayName: getSubjectDisplayName(subjectId),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const byDate: Record<string, number> = {};
  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    const created = data.createdAt?.toDate?.() || data.createdAt;
    const dateStr = created ? new Date(created).toISOString().slice(0, 10) : "unknown";
    if (dateStr !== "unknown") {
      byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    }
  });

  const sortedDates = Object.keys(byDate).sort();
  const start = dateRange
    ? dateRange.start.toISOString().slice(0, 10)
    : sortedDates[0] ?? new Date().toISOString().slice(0, 10);
  const end = dateRange
    ? dateRange.end.toISOString().slice(0, 10)
    : sortedDates[sortedDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const allDates = getDatesBetween(new Date(start), new Date(end));

  let running = 0;
  sortedDates.forEach((d) => {
    if (d < start) running += byDate[d] ?? 0;
  });
  const signUpsOverTime: { date: string; count: number; cumulative: number }[] = allDates.map((date) => {
    const count = byDate[date] ?? 0;
    running += count;
    return { date, count, cumulative: running };
  });

  const backfillByDate = (backfillSnap.data()?.byDate as Record<string, number>) || {};
  Object.entries(backfillByDate).forEach(([d, n]) => {
    if (typeof n === "number" && n > 0) {
      byDateEnrollments[d] = (byDateEnrollments[d] || 0) + n;
    }
  });

  const sortedEnrollmentDatesForShortfall = Object.keys(byDateEnrollments).sort();
  let runningEnrollmentsForShortfall = 0;
  sortedEnrollmentDatesForShortfall.forEach((d) => {
    if (d < start) runningEnrollmentsForShortfall += byDateEnrollments[d] ?? 0;
  });
  allDates.forEach((d) => {
    runningEnrollmentsForShortfall += byDateEnrollments[d] ?? 0;
  });
  const cumulativeAtEnd = runningEnrollmentsForShortfall;
  let shortfall = totalSubjectsEnrolled - cumulativeAtEnd;
  if (shortfall > 0) {
    const totalSignupsInRange = allDates.reduce((s, d) => s + (byDate[d] ?? 0), 0);
    const weights = allDates.map((date) => {
      const signupsHere = byDate[date] ?? 0;
      const idx = allDates.indexOf(date);
      const nextDaysSignups = allDates.slice(idx + 1, idx + 8).reduce((s, d) => s + (byDate[d] ?? 0), 0);
      return signupsHere * 0.5 + nextDaysSignups * 0.3 + (totalSignupsInRange > 0 ? 0.2 / allDates.length : 1 / allDates.length);
    });
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;
    let remaining = shortfall;
    for (let i = 0; i < allDates.length && remaining > 0; i++) {
      const add = Math.min(remaining, Math.max(0, Math.round((shortfall * weights[i]) / sumW)));
      if (add > 0) {
        byDateEnrollments[allDates[i]] = (byDateEnrollments[allDates[i]] || 0) + add;
        remaining -= add;
      }
    }
    if (remaining > 0) byDateEnrollments[allDates[allDates.length - 1]] = (byDateEnrollments[allDates[allDates.length - 1]] || 0) + remaining;
  }

  const sortedEnrollmentDates = Object.keys(byDateEnrollments).sort();
  let runningEnrollments = 0;
  sortedEnrollmentDates.forEach((d) => {
    if (d < start) runningEnrollments += byDateEnrollments[d] ?? 0;
  });
  const enrollmentsOverTime: { date: string; count: number; cumulative: number }[] = allDates.map((date) => {
    const count = byDateEnrollments[date] ?? 0;
    runningEnrollments += count;
    return { date, count, cumulative: runningEnrollments };
  });

  const { average: averageApScoreLift, bySubject: averageApScoreLiftBySubject } =
    await computeApScoreLiftBreakdown(firestore, userSubjectsSnap.docs);

  const usersByStateMap: Record<string, number> = {};
  usersSnap.docs.forEach((doc) => {
    const st = doc.data().inferredState;
    const key =
      typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim()) ? st.trim().toUpperCase() : "International";
    usersByStateMap[key] = (usersByStateMap[key] || 0) + 1;
  });
  const usersByState = Object.entries(usersByStateMap)
    .map(([stateCode, count]) => ({ stateCode, count }))
    .sort((a, b) => b.count - a.count);
  const internationalRegionCount = usersByStateMap["International"] ?? 0;
  const statesWithUsersCount = Object.entries(usersByStateMap).filter(
    ([code, n]) => code !== "International" && /^[A-Z]{2}$/.test(code) && n > 0,
  ).length;

  return {
    signUpsOverTime,
    enrollmentsOverTime,
    courseEnrollments: courseEnrollmentsDistribution,
    averageApScoreLift,
    platformAccuracyRate: averageApScoreLift ?? 0,
    averageScoreImprovement: averageApScoreLift,
    averageApScoreLiftBySubject,
    usersByState,
    internationalRegionCount,
    statesWithUsersCount,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  const db = getDb();
  if (!decoded || !(await isPlatformAdmin(db, decoded.email, decoded.uid))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  const rangeParam = String((req.query.range as string) || "all").trim();
  const part = String((req.query.part as string) || "").trim().toLowerCase();

  try {
    if (part === "summary") {
      const data = await buildSummaryData(firestore);
      return res.status(200).json({ success: true, data });
    }

    if (part === "analytics") {
      await runNjBackfillChunkIfNeeded(firestore);
      const data = await buildAnalyticsData(firestore, rangeParam);
      return res.status(200).json({ success: true, data });
    }

    await runNjBackfillChunkIfNeeded(firestore);
    const [summary, analytics] = await Promise.all([
      buildSummaryData(firestore),
      buildAnalyticsData(firestore, rangeParam),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        ...summary,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
