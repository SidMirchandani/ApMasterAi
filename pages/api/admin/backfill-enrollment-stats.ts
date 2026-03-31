import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isEnvAdminEmail, isPlatformAdmin } from "../../../server/platform-admin";

function getDatesBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function getAllTimeDateRange(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  const sep1 = new Date(end.getFullYear(), 8, 1);
  start.setTime(sep1.getTime());
  if (end < sep1) start.setFullYear(end.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * POST /api/admin/backfill-enrollment-stats
 * Backfills insights_enrollment_backfill/default so that cumulative subjects enrolled
 * over time reaches at least totalSubjectsEnrolled (126), with distribution
 * correlated to signups (not all on signup day; some spread 0–7 days after).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
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
  if (!isEnvAdminEmail(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  try {
    const dateRange = getAllTimeDateRange();
    const start = dateRange.start.toISOString().slice(0, 10);
    const end = dateRange.end.toISOString().slice(0, 10);
    const allDates = getDatesBetween(dateRange.start, dateRange.end);

    const usersSnap = await firestore.collection("users").get();
    const byDateSignups: Record<string, number> = {};
    usersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const created = data.createdAt?.toDate?.() || data.createdAt;
      const dateStr = created ? new Date(created).toISOString().slice(0, 10) : null;
      if (dateStr) {
        byDateSignups[dateStr] = (byDateSignups[dateStr] || 0) + 1;
      }
    });

    const userSubjectsSnap = await firestore.collection("user_subjects").get();
    const totalSubjectsEnrolled = userSubjectsSnap.size;
    const byDateEnrollments: Record<string, number> = {};
    userSubjectsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const created =
        data.createdAt?.toDate?.() ||
        data.createdAt ||
        data.enrolledAt?.toDate?.() ||
        data.enrolledAt ||
        data.created_at?.toDate?.() ||
        data.created_at ||
        data.dateAdded?.toDate?.() ||
        data.dateAdded;
      if (created) {
        const dateStr = new Date(created).toISOString().slice(0, 10);
        byDateEnrollments[dateStr] = (byDateEnrollments[dateStr] || 0) + 1;
      }
    });

    let running = 0;
    allDates.forEach((d) => {
      running += byDateEnrollments[d] ?? 0;
    });
    const cumulativeAtEnd = running;
    const target = Math.max(totalSubjectsEnrolled, 126);
    let shortfall = target - cumulativeAtEnd;

    if (shortfall <= 0) {
      await firestore.collection("insights_enrollment_backfill").doc("default").set({ byDate: {} });
      return res.status(200).json({
        success: true,
        message: "No backfill needed; cumulative already >= total.",
        totalSubjectsEnrolled,
        cumulativeAtEnd,
      });
    }

    const totalSignupsInRange = allDates.reduce((s, d) => s + (byDateSignups[d] ?? 0), 0);
    const weights = allDates.map((date, idx) => {
      const signupsHere = byDateSignups[date] ?? 0;
      const nextDaysSignups = allDates
        .slice(idx + 1, idx + 8)
        .reduce((s, d) => s + (byDateSignups[d] ?? 0), 0);
      return signupsHere * 0.5 + nextDaysSignups * 0.3 + (totalSignupsInRange > 0 ? 0.2 / allDates.length : 1 / allDates.length);
    });
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;

    const backfillByDate: Record<string, number> = {};
    let remaining = shortfall;
    for (let i = 0; i < allDates.length && remaining > 0; i++) {
      const add = Math.min(remaining, Math.max(0, Math.round((shortfall * weights[i]) / sumW)));
      if (add > 0) {
        backfillByDate[allDates[i]] = (backfillByDate[allDates[i]] || 0) + add;
        remaining -= add;
      }
    }
    if (remaining > 0) {
      const last = allDates[allDates.length - 1];
      backfillByDate[last] = (backfillByDate[last] || 0) + remaining;
    }

    await firestore.collection("insights_enrollment_backfill").doc("default").set({ byDate: backfillByDate });

    return res.status(200).json({
      success: true,
      message: "Backfill written.",
      totalSubjectsEnrolled,
      cumulativeAtEnd,
      shortfall,
      backfillDates: Object.keys(backfillByDate).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
