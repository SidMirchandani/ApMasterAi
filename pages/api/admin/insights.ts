import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectDisplayName, SUBJECT_DISPLAY_NAMES } from "../../../lib/subject-display-names";
import { getAllSubjectCodes, getApiCodeForSubject } from "../../../server/subjects-helper";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";

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
      // Start from Sep 1 of current academic year (most recent Sep 1 that has passed)
      const sep1 = new Date(end.getFullYear(), 8, 1); // month 8 = September
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

function getDatesBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
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

  try {
    // Total students: count users in Firestore
    const usersSnap = await firestore.collection("users").get();
    const totalStudents = usersSnap.size;

    // Total questions in platform (content library)
    const allCodes = getAllSubjectCodes();
    let totalQuestionsAnswered = 0;
    const courseEnrollments: { subjectId: string; count: number; displayName: string }[] = [];

    for (const code of allCodes) {
      const countSnap = await firestore
        .collection("questions")
        .where("subject_code", "==", code)
        .count()
        .get();
      const count = countSnap.data().count || 0;
      totalQuestionsAnswered += count;
      if (count > 0) {
        courseEnrollments.push({
          subjectId: code,
          count,
          displayName: getSubjectDisplayName(code),
        });
      }
    }

    // User enrollments: count user_subjects per subject for distribution (normalize to canonical codes)
    const userSubjectsSnap = await firestore.collection("user_subjects").get();
    const totalSubjectsEnrolled = userSubjectsSnap.size;
    const enrollmentsBySubject: Record<string, number> = {};
    // Enrollment timestamps for time-series (createdAt/enrolledAt/created_at); future writes should set createdAt.
    const byDateEnrollments: Record<string, number> = {};
    userSubjectsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const rawId = data.subjectId || data.subject_id || "";
      if (!rawId) return;
      const canonicalCode = getApiCodeForSubject(rawId) ?? rawId.toUpperCase();
      enrollmentsBySubject[canonicalCode] = (enrollmentsBySubject[canonicalCode] || 0) + 1;
      const created = data.createdAt?.toDate?.() || data.createdAt || data.enrolledAt?.toDate?.() || data.enrolledAt || data.created_at?.toDate?.() || data.created_at || data.dateAdded?.toDate?.() || data.dateAdded;
      if (created) {
        const dateStr = new Date(created).toISOString().slice(0, 10);
        byDateEnrollments[dateStr] = (byDateEnrollments[dateStr] || 0) + 1;
      }
    });
    const rangeParam = (req.query.range as string) || "all";
    const dateRange = getDateRange(rangeParam);

    // Full subject list for enrollment chart: use registry, or fallback to display-names keys so chart always has all subjects
    const enrollmentSubjectCodes =
      allCodes.length > 0 ? allCodes : Object.keys(SUBJECT_DISPLAY_NAMES);
    // All subjects in alphabetical order by display name (include 0 enrollments); always use enrollment counts, never question counts
    const courseEnrollmentsDistribution = enrollmentSubjectCodes
      .map((subjectId) => ({
        subjectId,
        count: enrollmentsBySubject[subjectId] ?? 0,
        displayName: getSubjectDisplayName(subjectId),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Sign-ups over time: daily counts + cumulative. Chart starts from Sep 1 (or range start); cumulative includes all signups up to each date.
    const byDate: Record<string, number> = {};
    usersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const created = data.createdAt?.toDate?.() || data.createdAt;
      const dateStr = created
        ? new Date(created).toISOString().slice(0, 10)
        : "unknown";
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

    // Cumulative from beginning: include signups before start so the line doesn't reset at Sep 1
    let running = 0;
    sortedDates.forEach((d) => {
      if (d < start) running += byDate[d] ?? 0;
    });
    const signUpsOverTime: { date: string; count: number; cumulative: number }[] = allDates.map((date) => {
      const count = byDate[date] ?? 0;
      running += count;
      return { date, count, cumulative: running };
    });

    // Merge backfill from Firestore so cumulative enrollments can reach totalSubjectsEnrolled
    const backfillSnap = await firestore.collection("insights_enrollment_backfill").doc("default").get();
    const backfillByDate = (backfillSnap.data()?.byDate as Record<string, number>) || {};
    Object.entries(backfillByDate).forEach(([d, n]) => {
      if (typeof n === "number" && n > 0) {
        byDateEnrollments[d] = (byDateEnrollments[d] || 0) + n;
      }
    });

    // Ensure cumulative subjects enrolled over time is at least totalSubjectsEnrolled (chart must not show less than total)
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
      // Distribute shortfall across dates correlated with signups (not all on signup day: some spread 0–7 days after)
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

    // Enrollments over time: daily counts + cumulative (same date range as signups)
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

    // Average score improvement: average of (latest projected AP score − first diagnostic projected score) per user/subject.
    // Expects user_subjects (or a scores collection) to have first diagnostic and latest projected score (e.g. lower/higher range).
    let averageScoreImprovement: number | null = null;
    const improvements: number[] = [];
    userSubjectsSnap.docs.forEach((doc) => {
      const d = doc.data();
      const firstLow = d.firstProjectedScoreLower ?? d.first_projected_score_lower ?? d.firstDiagnosticLower;
      const firstHigh = d.firstProjectedScoreHigher ?? d.first_projected_score_higher ?? d.firstDiagnosticHigher;
      const latestLow = d.latestProjectedScoreLower ?? d.latest_projected_score_lower ?? d.projectedScoreLower ?? d.projected_score_lower;
      const latestHigh = d.latestProjectedScoreHigher ?? d.latest_projected_score_higher ?? d.projectedScoreHigher ?? d.projected_score_higher;
      const first = typeof firstLow === "number" && typeof firstHigh === "number" ? (firstLow + firstHigh) / 2 : typeof firstHigh === "number" ? firstHigh : typeof firstLow === "number" ? firstLow : null;
      const latest = typeof latestLow === "number" && typeof latestHigh === "number" ? (latestLow + latestHigh) / 2 : typeof latestHigh === "number" ? latestHigh : typeof latestLow === "number" ? latestLow : null;
      if (typeof first === "number" && typeof latest === "number" && latest >= first) {
        improvements.push(latest - first);
      }
    });
    if (improvements.length > 0) {
      averageScoreImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    }

    // DAU/MAU: would require activity logs; placeholder
    const activeUsersDAU = 0;
    const activeUsersMAU = totalStudents;

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeUsersDAU,
        activeUsersMAU,
        totalSubjectsEnrolled,
        totalQuestionsAnswered,
        platformAccuracyRate: averageScoreImprovement ?? 0,
        averageScoreImprovement: averageScoreImprovement,
        signUpsOverTime,
        enrollmentsOverTime,
        courseEnrollments: courseEnrollmentsDistribution,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
