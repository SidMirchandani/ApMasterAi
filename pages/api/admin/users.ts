import type { NextApiRequest, NextApiResponse } from "next";
import type { DocumentData, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { isAdminEmailFromEnv } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { deriveShowInAdminUserList } from "../../../server/admin-user-list";
import { getUserStatsBatch } from "../../../server/user-stats";

type RowOut = {
  id: string;
  firebaseUid: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  state: string | null;
  country: string | null;
  joinDate: string;
  lastLogin: string | null;
  status: "active" | "banned";
  isAdmin: boolean;
  hasEnvAdmin: boolean;
  hasDbAdmin: boolean;
  subjectCount: number;
  questionCount: number;
  subjectNames: string[];
  totalCoursesEnrolled: number | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const USER_SCAN_BATCH_MULTIPLIER = 3;
const USER_SCAN_BATCH_MAX = 250;
const IN_QUERY_CHUNK_SIZE = 30;

function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(d.getTime()) ? d.toISOString() : "";
  }
  if (typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const d = new Date((value as { toMillis: () => number }).toMillis());
    return Number.isFinite(d.getTime()) ? d.toISOString() : "";
  }
  const d = new Date(value as string | number | Date);
  return Number.isFinite(d.getTime()) ? d.toISOString() : "";
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function splitDisplayName(data: DocumentData): { firstName: string | null; lastName: string | null; name: string | null } {
  const firstName = cleanText(data.firstName);
  const lastName = cleanText(data.lastName);
  const name = cleanText(data.displayName) || cleanText(data.username) || [firstName, lastName].filter(Boolean).join(" ") || null;
  if (firstName || lastName) return { firstName, lastName, name };
  if (!name) return { firstName: null, lastName: null, name: null };
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
    name,
  };
}

function isDocEligibleForAdminBrowse(data: DocumentData): boolean {
  if (data.showInAdminUserList === true) return true;
  if (data.showInAdminUserList === false) return false;
  return deriveShowInAdminUserList({
    email: data.email,
    username: typeof data.username === "string" ? data.username : data.displayName,
    displayName: data.displayName,
  });
}

function subjectNameFromDoc(data: DocumentData): string | null {
  return cleanText(data.subjectId) || cleanText(data.name);
}

function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function loadSubjectsForUserIds(firestore: Firestore, userIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return out;

  const snaps = await Promise.all(
    chunk(uniqueIds, IN_QUERY_CHUNK_SIZE).map((ids) =>
      firestore
        .collection("user_subjects")
        .where("userId", "in", ids)
        .select("userId", "subjectId", "name")
        .get(),
    ),
  );

  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const data = doc.data();
      const userId = cleanText(data.userId);
      const subjectName = subjectNameFromDoc(data);
      if (!userId || !subjectName) continue;
      const list = out.get(userId) ?? [];
      list.push(subjectName);
      out.set(userId, list);
    }
  }
  for (const [key, list] of out) {
    out.set(key, Array.from(new Set(list)).sort((a, b) => a.localeCompare(b)));
  }
  return out;
}

function getSubjectsForUser(subjectsByUser: Map<string, string[]>, docId: string, firebaseUid: string | null): string[] {
  return subjectsByUser.get(docId) ?? (firebaseUid ? subjectsByUser.get(firebaseUid) : undefined) ?? [];
}

function mapDoc(doc: QueryDocumentSnapshot, subjects: string[], stats: Partial<{
  coursesEnrolledTotal: number;
  questionsAnsweredTotal: number;
}> | null): RowOut {
  const data = doc.data();
  const email = String(data.email || data.username || "(no email)");
  const names = splitDisplayName(data);
  const hasDbAdmin = data.isAdmin === true;
  const hasEnvAdmin = isAdminEmailFromEnv(email);
  const subjectCount =
    typeof stats?.coursesEnrolledTotal === "number"
      ? Number(stats.coursesEnrolledTotal)
      : subjects.length;

  return {
    id: doc.id,
    firebaseUid: cleanText(data.firebaseUid) || doc.id,
    name: names.name,
    firstName: names.firstName,
    lastName: names.lastName,
    email,
    state: cleanText(data.inferredState),
    country: cleanText(data.inferredCountry),
    joinDate: toIso(data.createdAt || data.joinDate),
    lastLogin: toIso(data.lastLoginAt || data.lastLogin) || null,
    status: data.banned === true ? "banned" : "active",
    isAdmin: hasEnvAdmin || hasDbAdmin,
    hasEnvAdmin,
    hasDbAdmin,
    subjectCount,
    questionCount: typeof stats?.questionsAnsweredTotal === "number" ? Number(stats.questionsAnsweredTotal) : 0,
    subjectNames: subjects,
    totalCoursesEnrolled: subjectCount,
  };
}

function parseLimit(value: unknown): number {
  const raw = Number.parseInt(String(value || DEFAULT_LIMIT), 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, raw));
}

function routeParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

async function getCheapEligibleTotal(firestore: Firestore): Promise<number | null> {
  try {
    const snap = await firestore.collection("users").where("showInAdminUserList", "==", true).count().get();
    return Number(snap.data().count || 0);
  } catch {
    return null;
  }
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

  try {
    const limit = parseLimit(req.query.limit);
    const cursor = routeParam(req.query.cursor);
    const scanBatchSize = Math.min(
      USER_SCAN_BATCH_MAX,
      Math.max(limit * USER_SCAN_BATCH_MULTIPLIER, limit),
    );
    const totalUsersPromise = getCheapEligibleTotal(firestore);

    let query = firestore
      .collection("users")
      .orderBy("createdAt", "desc")
      .select(
        "firebaseUid",
        "email",
        "username",
        "displayName",
        "firstName",
        "lastName",
        "photoURL",
        "createdAt",
        "joinDate",
        "lastLoginAt",
        "lastLogin",
        "inferredState",
        "inferredCountry",
        "isAdmin",
        "banned",
        "showInAdminUserList",
      );

    if (cursor) {
      const cursorSnap = await firestore.collection("users").doc(cursor).get();
      if (!cursorSnap.exists) {
        return res.status(400).json({ error: "Invalid cursor" });
      }
      query = query.startAfter(cursorSnap);
    }

    const eligibleDocs: QueryDocumentSnapshot[] = [];
    let lastScannedDoc: QueryDocumentSnapshot | null = null;
    let nextCursorDoc: QueryDocumentSnapshot | null = null;
    let exhausted = false;
    let filledPage = false;

    while (eligibleDocs.length < limit && !exhausted) {
      const snap = await query.limit(scanBatchSize).get();
      if (snap.empty) {
        exhausted = true;
        break;
      }
      lastScannedDoc = snap.docs[snap.docs.length - 1] ?? lastScannedDoc;
      for (const doc of snap.docs) {
        nextCursorDoc = doc;
        if (isDocEligibleForAdminBrowse(doc.data())) {
          eligibleDocs.push(doc);
          if (eligibleDocs.length >= limit) {
            filledPage = true;
            break;
          }
        }
      }
      exhausted = snap.size < scanBatchSize;
      if (!exhausted && lastScannedDoc) query = query.startAfter(lastScannedDoc);
    }

    const userIds = eligibleDocs.map((doc) => doc.id);
    const firebaseUids = eligibleDocs
      .map((doc) => cleanText(doc.data().firebaseUid) || doc.id)
      .filter(Boolean) as string[];
    const lookupIds = Array.from(new Set([...userIds, ...firebaseUids]));
    const [statsByUser, subjectsByUser, totalUsers] = await Promise.all([
      getUserStatsBatch(firestore, lookupIds),
      loadSubjectsForUserIds(firestore, lookupIds),
      totalUsersPromise,
    ]);

    const users = eligibleDocs.map((doc) => {
      const data = doc.data();
      const firebaseUid = cleanText(data.firebaseUid) || doc.id;
      const subjects = getSubjectsForUser(subjectsByUser, doc.id, firebaseUid);
      const stats = statsByUser.get(doc.id) ?? (firebaseUid ? statsByUser.get(firebaseUid) : undefined) ?? null;
      return mapDoc(doc, subjects, stats);
    });

    return res.status(200).json({
      success: true,
      data: {
        users,
        nextCursor: (filledPage || !exhausted) && nextCursorDoc ? nextCursorDoc.id : null,
        hasMore: (filledPage || !exhausted) && Boolean(nextCursorDoc),
        loadedCount: users.length,
        totalUsers,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
}
