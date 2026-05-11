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

async function loadSubjectsByUser(firestore: Firestore): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const snap = await firestore.collection("user_subjects").select("userId", "subjectId", "name").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const userId = cleanText(data.userId);
    const subjectName = subjectNameFromDoc(data);
    if (!userId || !subjectName) continue;
    const list = out.get(userId) ?? [];
    list.push(subjectName);
    out.set(userId, list);
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
    const [usersSnap, subjectsByUser] = await Promise.all([
      firestore
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
        )
        .get(),
      loadSubjectsByUser(firestore),
    ]);

    const eligibleDocs = usersSnap.docs.filter((doc) => isDocEligibleForAdminBrowse(doc.data()));
    const userIds = eligibleDocs.map((doc) => doc.id);
    const statsByUser = await getUserStatsBatch(firestore, userIds);

    const users = eligibleDocs.map((doc) => {
      const data = doc.data();
      const firebaseUid = cleanText(data.firebaseUid) || doc.id;
      const subjects = getSubjectsForUser(subjectsByUser, doc.id, firebaseUid);
      const stats = statsByUser.get(doc.id) ?? (firebaseUid ? statsByUser.get(firebaseUid) : undefined) ?? null;
      return mapDoc(doc, subjects, stats);
    });

    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
}
