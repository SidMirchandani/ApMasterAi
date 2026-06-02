import type { NextApiRequest, NextApiResponse } from "next";
import type { Firestore } from "firebase-admin/firestore";
import { AggregateField, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { getSubjectDisplayName, SUBJECT_DISPLAY_NAMES } from "../../../lib/subject-display-names";
import { getAllSubjectCodes, getApiCodeForSubject } from "../../../server/subjects-helper";
import { computeApScoreLiftBreakdown } from "../../../server/insights-score-lift";
import { runNjBackfillChunkIfNeeded } from "../../../server/nj-backfill-migration";
import { requireAdmin } from "../../../server/next-api-auth";
import { aggregateGlobalStatsFromUserStats } from "../../../server/user-stats";

type RangeKey = "7d" | "30d" | "90d" | "180d" | "365d" | "ytd" | "all" | "custom";

/** All chart bucketing and ranges use US Eastern (handles EST/EDT). */
const EASTERN_TZ = "America/New_York";
const EASTERN_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: EASTERN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const RESPONSE_CACHE_TTL_MS = 60_000;
const GEO_AGGREGATE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const AGG_WRITE_BATCH_SIZE = 400;
const NJ_BACKFILL_ON_INSIGHTS = process.env.ADMIN_INSIGHTS_NJ_BACKFILL === "1";
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();
const AGG_USER_DAILY_COL = "insights_user_daily";
const AGG_SUBJECT_DAILY_COL = "insights_subject_daily";
const AGG_GEO_DOC_PATH = "insights_user_geo/current";

function maybeRunNjBackfill(firestore: Firestore): void {
  if (!NJ_BACKFILL_ON_INSIGHTS) return;
  void runNjBackfillChunkIfNeeded(firestore).catch((err) =>
    console.error("[admin/insights] NJ backfill chunk failed", err),
  );
}

function aggregateUpdatedAtMs(data: Record<string, unknown>): number | null {
  const raw = data.updatedAt;
  if (raw == null) return null;
  if (typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  if (typeof (raw as { toDate?: () => Date }).toDate === "function") {
    const t = (raw as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function toEasternDateKey(d: Date): string {
  return EASTERN_DATE_FMT.format(d);
}

function cacheGet<T>(key: string): T | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs = RESPONSE_CACHE_TTL_MS): void {
  responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Smallest UTC instant whose Eastern calendar date is `dateKey` (YYYY-MM-DD). */
function startOfEasternDay(dateKey: string): Date {
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  let lo = Date.UTC(y, m - 1, d) - 3 * 86400000;
  let hi = Date.UTC(y, m - 1, d) + 3 * 86400000;
  for (let i = 0; i < 48; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const k = toEasternDateKey(new Date(mid));
    if (k < dateKey) lo = mid + 1;
    else hi = mid;
  }
  return new Date(lo);
}

function prevEasternDateKey(dateKey: string): string {
  const s = startOfEasternDay(dateKey);
  return toEasternDateKey(new Date(s.getTime() - 1));
}

/** Academic year start (Sep 1) in Eastern for the school year containing `reference`. */
function academicYearStartKeyEastern(reference: Date): string {
  const key = toEasternDateKey(reference);
  const month = Number(key.slice(5, 7));
  const year = Number(key.slice(0, 4));
  if (month >= 9) return `${year}-09-01`;
  return `${year - 1}-09-01`;
}

/**
 * Inclusive Eastern calendar range for charts and filters.
 * Matches prior behavior: rolling N calendar days ending on "today" in Eastern (7d/30d/90d),
 * or Sep 1 academic year through today for "all".
 */
function getDateRangeEastern(
  range: string,
  custom?: { startDate?: string; endDate?: string },
): { startKey: string; endKey: string } | null {
  const now = new Date();
  const todayKey = toEasternDateKey(now);
  switch (range as RangeKey) {
    case "7d":
    case "30d":
    case "90d":
    case "180d":
    case "365d": {
      const days =
        range === "7d"
          ? 7
          : range === "30d"
            ? 30
            : range === "90d"
              ? 90
              : range === "180d"
                ? 180
                : 365;
      let startKey = todayKey;
      for (let i = 0; i < days; i++) {
        startKey = prevEasternDateKey(startKey);
      }
      return { startKey, endKey: todayKey };
    }
    case "ytd": {
      const year = Number(todayKey.slice(0, 4));
      return { startKey: `${year}-01-01`, endKey: todayKey };
    }
    case "custom": {
      const startRaw = String(custom?.startDate || "").trim();
      const endRaw = String(custom?.endDate || "").trim();
      const valid = /^\d{4}-\d{2}-\d{2}$/;
      if (valid.test(startRaw) && valid.test(endRaw)) {
        if (startRaw <= endRaw) return { startKey: startRaw, endKey: endRaw };
        return { startKey: endRaw, endKey: startRaw };
      }
      if (valid.test(startRaw)) return { startKey: startRaw, endKey: todayKey };
      if (valid.test(endRaw)) return { startKey: academicYearStartKeyEastern(now), endKey: endRaw };
      return { startKey: academicYearStartKeyEastern(now), endKey: todayKey };
    }
    case "all": {
      const startKey = academicYearStartKeyEastern(now);
      return { startKey, endKey: todayKey };
    }
    default:
      return null;
  }
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

/** Consecutive Eastern calendar date strings from startKey through endKey inclusive. */
function getEasternDateKeysBetweenInclusive(startKey: string, endKey: string): string[] {
  if (startKey > endKey) return [];
  const out: string[] = [];
  let cur = startKey;
  const max = 4000;
  for (let n = 0; n < max && cur <= endKey; n++) {
    out.push(cur);
    if (cur === endKey) break;
    const s = startOfEasternDay(cur);
    let t = s.getTime() + 25 * 3600000;
    let next = toEasternDateKey(new Date(t));
    let guard = 0;
    while (next <= cur && guard++ < 72) {
      t += 3600000;
      next = toEasternDateKey(new Date(t));
    }
    if (next <= cur) break;
    cur = next;
  }
  return out;
}

function asNumberOrZero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

async function readGeoFromAggregates(firestore: Firestore): Promise<{
  usersByState: { stateCode: string; count: number }[];
  internationalRegionCount: number;
  statesWithUsersCount: number;
} | null> {
  try {
    const geoSnap = await firestore.doc(AGG_GEO_DOC_PATH).get();
    if (!geoSnap.exists) return null;
    const data = geoSnap.data() || {};
    const updatedMs = aggregateUpdatedAtMs(data);
    if (!updatedMs || Date.now() - updatedMs > GEO_AGGREGATE_MAX_AGE_MS) return null;
    const stateCounts =
      asRecord(data.usersByState).stateCounts ??
      asRecord(data.usersByState).byState ??
      data.usersByState ??
      data.stateCounts;
    const byState = asRecord(stateCounts);
    const usersByState = Object.entries(byState)
      .map(([stateCode, count]) => ({ stateCode, count: asNumberOrZero(count) }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
    if (!usersByState.length) return null;
    const internationalRegionCount =
      asNumberOrZero(data.internationalRegionCount) || asNumberOrZero(byState.International);
    const statesWithUsersCount =
      asNumberOrZero(data.statesWithUsersCount) ||
      usersByState.filter(
        (row) => row.stateCode !== "International" && /^[A-Z]{2}$/.test(row.stateCode),
      ).length;
    return { usersByState, internationalRegionCount, statesWithUsersCount };
  } catch {
    return null;
  }
}

async function persistGeoAggregate(
  firestore: Firestore,
  geo: {
    usersByState: { stateCode: string; count: number }[];
    internationalRegionCount: number;
    statesWithUsersCount: number;
  },
): Promise<void> {
  try {
    const stateCounts = Object.fromEntries(
      geo.usersByState.map((row) => [row.stateCode, row.count]),
    );
    await firestore.doc(AGG_GEO_DOC_PATH).set(
      {
        usersByState: { stateCounts },
        internationalRegionCount: geo.internationalRegionCount,
        statesWithUsersCount: geo.statesWithUsersCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("[admin/insights] persist geo aggregate failed", err);
  }
}

async function persistDailySignupAggregates(
  firestore: Firestore,
  byDate: Record<string, number>,
): Promise<void> {
  const entries = Object.entries(byDate).filter(
    ([k, n]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && n > 0,
  );
  if (!entries.length) return;
  try {
    for (let i = 0; i < entries.length; i += AGG_WRITE_BATCH_SIZE) {
      const batch = firestore.batch();
      for (const [dateKey, count] of entries.slice(i, i + AGG_WRITE_BATCH_SIZE)) {
        batch.set(
          firestore.collection(AGG_USER_DAILY_COL).doc(dateKey),
          { dateKey, count, signups: count, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }
      await batch.commit();
    }
  } catch (err) {
    console.error("[admin/insights] persist user daily aggregates failed", err);
  }
}

async function persistSubjectDailyAggregates(
  firestore: Firestore,
  byDate: Record<string, number>,
): Promise<void> {
  const entries = Object.entries(byDate).filter(
    ([k, n]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && n > 0,
  );
  if (!entries.length) return;
  try {
    for (let i = 0; i < entries.length; i += AGG_WRITE_BATCH_SIZE) {
      const batch = firestore.batch();
      for (const [dateKey, count] of entries.slice(i, i + AGG_WRITE_BATCH_SIZE)) {
        batch.set(
          firestore.collection(AGG_SUBJECT_DAILY_COL).doc(dateKey),
          { dateKey, count, enrollments: count, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }
      await batch.commit();
    }
  } catch (err) {
    console.error("[admin/insights] persist subject daily aggregates failed", err);
  }
}

async function readDailyAggregates(
  firestore: Firestore,
  collectionName: string,
  startKey: string,
  endKey: string,
): Promise<Record<string, number> | null> {
  try {
    const q = await firestore
      .collection(collectionName)
      .where("dateKey", ">=", startKey)
      .where("dateKey", "<=", endKey)
      .select("dateKey", "count", "total", "signups", "enrollments")
      .get();
    if (q.empty) return null;
    const out: Record<string, number> = {};
    for (const doc of q.docs) {
      const data = doc.data();
      const key = String(data.dateKey || doc.id || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const count =
        asNumberOrZero(data.count) ||
        asNumberOrZero(data.total) ||
        asNumberOrZero(data.signups) ||
        asNumberOrZero(data.enrollments);
      out[key] = (out[key] || 0) + count;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

async function readSubjectAggregates(
  firestore: Firestore,
  startKey: string,
  endKey: string,
): Promise<{ bySubject: Record<string, number>; byDate: Record<string, number> } | null> {
  try {
    const q = await firestore
      .collection(AGG_SUBJECT_DAILY_COL)
      .where("dateKey", ">=", startKey)
      .where("dateKey", "<=", endKey)
      .get();
    if (q.empty) return null;
    const bySubject: Record<string, number> = {};
    const byDate: Record<string, number> = {};
    for (const doc of q.docs) {
      const data = doc.data();
      const dateKey = String(data.dateKey || doc.id || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        byDate[dateKey] =
          (byDate[dateKey] || 0) + asNumberOrZero(data.count || data.total || data.enrollments);
      }
      const subjectId = String(data.subjectId || data.subject || "").trim();
      if (subjectId) {
        const canonical = getApiCodeForSubject(subjectId) ?? subjectId.toUpperCase();
        bySubject[canonical] =
          (bySubject[canonical] || 0) +
          asNumberOrZero(data.count || data.total || data.enrollments);
      }
      const subjectCounts = asRecord(
        data.subjectCounts || data.bySubject || data.enrollmentsBySubject,
      );
      for (const [k, v] of Object.entries(subjectCounts)) {
        const canonical = getApiCodeForSubject(k) ?? k.toUpperCase();
        bySubject[canonical] = (bySubject[canonical] || 0) + asNumberOrZero(v);
      }
    }
    return { bySubject, byDate };
  } catch {
    return null;
  }
}

/** Collection-group document count (quiz results under user_subjects). */
async function aggregateCollectionGroupCount(
  firestore: Firestore,
  collectionId: string,
): Promise<number> {
  try {
    const snap = await firestore
      .collectionGroup(collectionId)
      .aggregate({ n: AggregateField.count() })
      .get();
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
  const [usersCountSnap, userSubjectsCountSnap, questionCountSnap, quizBundle, rollupTotals] =
    await Promise.all([
      firestore.collection("users").count().get(),
      firestore.collection("user_subjects").count().get(),
      firestore.collection("questions").count().get(),
      Promise.all([
        aggregateCollectionGroupCount(firestore, "fullLengthTests"),
        aggregateCollectionGroupCount(firestore, "diagnosticTests"),
        aggregateCollectionGroupCount(firestore, "unitQuizResults"),
        aggregateStudentQuestionAttempts(firestore),
      ]),
      aggregateGlobalStatsFromUserStats(firestore),
    ]);

  const totalQuestionsAnswered = questionCountSnap.data().count || 0;

  const totalStudents = rollupTotals?.totalStudents ?? (usersCountSnap.data().count || 0);
  const totalSubjectsEnrolled =
    rollupTotals?.totalSubjectEnrollments ?? (userSubjectsCountSnap.data().count || 0);
  const [fullLengthQuizCount, diagnosticQuizCount, unitQuizCount, totalStudentQuestionAttempts] =
    quizBundle;
  const totalQuizzesTaken =
    rollupTotals?.totalQuizzesTaken ?? fullLengthQuizCount + diagnosticQuizCount + unitQuizCount;
  const resolvedStudentAttempts =
    rollupTotals?.totalQuestionsAnswered ?? totalStudentQuestionAttempts;

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
    totalStudentQuestionAttempts: resolvedStudentAttempts,
  };
}

async function buildGeoData(firestore: Firestore) {
  const aggregateGeo = await readGeoFromAggregates(firestore);
  if (aggregateGeo) return aggregateGeo;

  const usersSnap = await firestore.collection("users").select("inferredState").get();
  const usersByStateMap: Record<string, number> = {};
  usersSnap.docs.forEach((doc) => {
    const st = doc.data().inferredState;
    const key =
      typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim())
        ? st.trim().toUpperCase()
        : "International";
    usersByStateMap[key] = (usersByStateMap[key] || 0) + 1;
  });
  const usersByState = Object.entries(usersByStateMap)
    .map(([stateCode, count]) => ({ stateCode, count }))
    .sort((a, b) => b.count - a.count);
  const internationalRegionCount = usersByStateMap["International"] ?? 0;
  const statesWithUsersCount = Object.entries(usersByStateMap).filter(
    ([code, n]) => code !== "International" && /^[A-Z]{2}$/.test(code) && n > 0,
  ).length;
  const result = { usersByState, internationalRegionCount, statesWithUsersCount };
  void persistGeoAggregate(firestore, result);
  return result;
}

/** Charts, geo, and optional score lift — reads users + user_subjects (projected when possible). */
async function buildAnalyticsData(
  firestore: Firestore,
  rangeParam: string,
  options: { includeLift: boolean; omitGeo: boolean; startDate?: string; endDate?: string },
) {
  const { includeLift, startDate, endDate } = options;
  const allCodes = getAllSubjectCodes();
  const dateRange = getDateRangeEastern(rangeParam, { startDate, endDate });
  const todayKey = toEasternDateKey(new Date());
  const start = dateRange?.startKey ?? academicYearStartKeyEastern(new Date());
  const end = dateRange?.endKey ?? todayKey;
  const allDates = getEasternDateKeysBetweenInclusive(start, end);

  const userSubjectsQuery = includeLift
    ? firestore.collection("user_subjects")
    : firestore
        .collection("user_subjects")
        .select("subjectId", "subject_id", "createdAt", "enrolledAt", "created_at", "dateAdded");

  const [userSubjectsSnap, backfillSnap, signupsByDateAgg, subjectAgg] = await Promise.all([
    userSubjectsQuery.get(),
    firestore.collection("insights_enrollment_backfill").doc("default").get(),
    readDailyAggregates(firestore, AGG_USER_DAILY_COL, start, end),
    readSubjectAggregates(firestore, start, end),
  ]);

  const totalSubjectsEnrolled = userSubjectsSnap.size;
  const enrollmentsBySubject: Record<string, number> = subjectAgg?.bySubject ?? {};
  const byDateEnrollments: Record<string, number> = subjectAgg?.byDate ?? {};
  userSubjectsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const rawId = data.subjectId || data.subject_id || "";
    if (!rawId) return;
    const canonicalCode = getApiCodeForSubject(rawId) ?? rawId.toUpperCase();
    const createdAt = parseEnrollmentCreated(data as Record<string, unknown>);
    const createdKey = createdAt ? toEasternDateKey(createdAt) : null;
    const countTowardSubjectBar =
      dateRange == null ||
      (createdKey != null && createdKey >= dateRange.startKey && createdKey <= dateRange.endKey);
    if (countTowardSubjectBar) {
      enrollmentsBySubject[canonicalCode] = (enrollmentsBySubject[canonicalCode] || 0) + 1;
    }
    if (createdAt) {
      const dateStr = toEasternDateKey(createdAt);
      if (!(dateStr in byDateEnrollments)) {
        byDateEnrollments[dateStr] = 0;
      }
      if (!subjectAgg || !(dateStr in subjectAgg.byDate)) {
        byDateEnrollments[dateStr] = (byDateEnrollments[dateStr] || 0) + 1;
      }
    }
  });

  const enrollmentSubjectCodes =
    allCodes.length > 0 ? allCodes : Object.keys(SUBJECT_DISPLAY_NAMES);
  const courseEnrollmentsDistribution = enrollmentSubjectCodes
    .map((subjectId) => ({
      subjectId,
      count: enrollmentsBySubject[subjectId] ?? 0,
      displayName: getSubjectDisplayName(subjectId),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  let byDate: Record<string, number> = signupsByDateAgg ?? {};
  if (!signupsByDateAgg) {
    const usersSnap = await firestore.collection("users").select("createdAt").get();
    byDate = {};
    usersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const created = data.createdAt?.toDate?.() || data.createdAt;
      const dateStr = created ? toEasternDateKey(new Date(created)) : "unknown";
      if (dateStr !== "unknown") byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    });
    void persistDailySignupAggregates(firestore, byDate);
  }
  const sortedDates = Object.keys(byDate).sort();
  let running = sortedDates.reduce((sum, d) => (d < start ? sum + (byDate[d] ?? 0) : sum), 0);
  const signUpsOverTime: { date: string; count: number; cumulative: number }[] = allDates.map(
    (date) => {
      const count = byDate[date] ?? 0;
      running += count;
      return { date, count, cumulative: running };
    },
  );

  const backfillByDate = (backfillSnap.data()?.byDate as Record<string, number>) || {};
  Object.entries(backfillByDate).forEach(([d, n]) => {
    if (typeof n === "number" && n > 0) {
      byDateEnrollments[d] = (byDateEnrollments[d] || 0) + n;
    }
  });

  if (!subjectAgg) {
    void persistSubjectDailyAggregates(firestore, byDateEnrollments);
  }

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
    const signupsPerDay = allDates.map((d) => byDate[d] ?? 0);
    const totalSignupsInRange = signupsPerDay.reduce((s, n) => s + n, 0);
    const prefix = new Array<number>(signupsPerDay.length + 1).fill(0);
    for (let i = 0; i < signupsPerDay.length; i++) {
      prefix[i + 1] = prefix[i] + signupsPerDay[i];
    }
    const rangeSum = (from: number, toExclusive: number) => prefix[toExclusive] - prefix[from];
    const weights = allDates.map((_, idx) => {
      const signupsHere = signupsPerDay[idx];
      const nextDaysSignups = rangeSum(idx + 1, Math.min(signupsPerDay.length, idx + 8));
      return (
        signupsHere * 0.5 +
        nextDaysSignups * 0.3 +
        (totalSignupsInRange > 0 ? 0.2 / allDates.length : 1 / allDates.length)
      );
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
    if (remaining > 0)
      byDateEnrollments[allDates[allDates.length - 1]] =
        (byDateEnrollments[allDates[allDates.length - 1]] || 0) + remaining;
  }

  const sortedEnrollmentDates = Object.keys(byDateEnrollments).sort();
  let runningEnrollments = 0;
  sortedEnrollmentDates.forEach((d) => {
    if (d < start) runningEnrollments += byDateEnrollments[d] ?? 0;
  });
  const enrollmentsOverTime: { date: string; count: number; cumulative: number }[] = allDates.map(
    (date) => {
      const count = byDateEnrollments[date] ?? 0;
      runningEnrollments += count;
      return { date, count, cumulative: runningEnrollments };
    },
  );

  let averageApScoreLift: number | null = null;
  let averageApScoreLiftBySubject: Awaited<
    ReturnType<typeof computeApScoreLiftBreakdown>
  >["bySubject"] = [];
  if (includeLift) {
    const lift = await computeApScoreLiftBreakdown(firestore, userSubjectsSnap.docs);
    averageApScoreLift = lift.average;
    averageApScoreLiftBySubject = lift.bySubject;
  }

  return {
    signUpsOverTime,
    enrollmentsOverTime,
    courseEnrollments: courseEnrollmentsDistribution,
    averageApScoreLift,
    platformAccuracyRate: averageApScoreLift ?? 0,
    averageScoreImprovement: averageApScoreLift,
    averageApScoreLiftBySubject,
    usersByState: [],
    internationalRegionCount: 0,
    statesWithUsersCount: 0,
    aggregateSources: {
      userDaily: !!signupsByDateAgg,
      subjectDaily: !!subjectAgg,
      userSubjectRollup: false,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!(await requireAdmin(req, res))) return;

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  const rangeParam = String((req.query.range as string) || "all").trim();
  const startDate = String((req.query.startDate as string) || "").trim();
  const endDate = String((req.query.endDate as string) || "").trim();
  const part = String((req.query.part as string) || "")
    .trim()
    .toLowerCase();
  const includeLift = String((req.query.includeLift as string) || "").trim() === "1";
  const omitGeo = String((req.query.omitGeo as string) || "").trim() === "1";
  const cacheKeyPrefix = [
    "admin-insights",
    part || "all",
    rangeParam,
    startDate || "_",
    endDate || "_",
    includeLift ? "lift" : "nolift",
    omitGeo ? "omitgeo" : "withgeo",
  ].join(":");

  try {
    if (part === "summary") {
      const cached = cacheGet<{ success: true; data: unknown }>(cacheKeyPrefix);
      if (cached) return res.status(200).json(cached);
      const data = await buildSummaryData(firestore);
      const payload = { success: true as const, data };
      cacheSet(cacheKeyPrefix, payload, RESPONSE_CACHE_TTL_MS);
      return res.status(200).json(payload);
    }

    if (part === "geo") {
      const cached = cacheGet<{ success: true; data: unknown }>(cacheKeyPrefix);
      if (cached) return res.status(200).json(cached);
      const data = await buildGeoData(firestore);
      const payload = { success: true as const, data };
      cacheSet(cacheKeyPrefix, payload, RESPONSE_CACHE_TTL_MS * 5);
      return res.status(200).json(payload);
    }

    if (part === "analytics") {
      const cached = cacheGet<{ success: true; data: unknown }>(cacheKeyPrefix);
      if (cached) return res.status(200).json(cached);
      maybeRunNjBackfill(firestore);
      const data = await buildAnalyticsData(firestore, rangeParam, {
        includeLift,
        omitGeo,
        startDate,
        endDate,
      });
      const payload = { success: true as const, data };
      cacheSet(cacheKeyPrefix, payload, RESPONSE_CACHE_TTL_MS);
      return res.status(200).json(payload);
    }

    const cached = cacheGet<{ success: true; data: unknown }>(cacheKeyPrefix);
    if (cached) return res.status(200).json(cached);
    maybeRunNjBackfill(firestore);
    const [summary, analytics, geo] = await Promise.all([
      buildSummaryData(firestore),
      buildAnalyticsData(firestore, rangeParam, { includeLift, omitGeo, startDate, endDate }),
      buildGeoData(firestore),
    ]);
    const payload = {
      success: true as const,
      data: {
        ...analytics,
        ...geo,
        ...summary,
      },
    };
    cacheSet(cacheKeyPrefix, payload, RESPONSE_CACHE_TTL_MS);
    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
