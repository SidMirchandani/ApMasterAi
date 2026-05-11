import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getDb } from "./db";
import { storage } from "./storage";

export function cleanAdminText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function toAdminJsonDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const d = new Date((value as { toMillis: () => number }).toMillis());
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const d = new Date(value as string | number | Date);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function normalizeSubjectDoc(doc: QueryDocumentSnapshot) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    dateAdded: toAdminJsonDate(data.dateAdded),
    lastStudied: toAdminJsonDate(data.lastStudied),
    createdAt: toAdminJsonDate(data.createdAt),
    updatedAt: toAdminJsonDate(data.updatedAt),
  };
}

function normalizeTest(
  doc: QueryDocumentSnapshot,
  data: DocumentData,
  subjectId: string,
  type: "full-length" | "diagnostic" | "unit",
) {
  const sectionCode = cleanAdminText(data.sectionCode);
  const sectionBreakdown =
    data.sectionBreakdown && typeof data.sectionBreakdown === "object"
      ? data.sectionBreakdown
      : {};
  const unitNumber =
    typeof data.unitNumber === "number"
      ? data.unitNumber
      : sectionCode && sectionBreakdown?.[sectionCode]?.unitNumber != null
        ? sectionBreakdown[sectionCode].unitNumber
        : undefined;

  return {
    id: cleanAdminText(data.id) || doc.id,
    date: toAdminJsonDate(data.date),
    score: typeof data.score === "number" ? data.score : 0,
    percentage: typeof data.percentage === "number" ? data.percentage : 0,
    totalQuestions: typeof data.totalQuestions === "number" ? data.totalQuestions : 0,
    subjectId,
    type,
    sectionBreakdown,
    ...(type === "unit" && {
      unitId: cleanAdminText(data.unitId),
      sectionCode,
      unitNumber,
    }),
  };
}

async function fetchUserSubjectDocs(storageUserIds: string[]) {
  const db = getDb();
  if (storageUserIds.length === 0) return [];
  const snap =
    storageUserIds.length === 1
      ? await db.collection("user_subjects").where("userId", "==", storageUserIds[0]).get()
      : await db.collection("user_subjects").where("userId", "in", storageUserIds).get();
  return snap.docs;
}

export async function loadAdminTargetUser(targetUserId: string) {
  const db = getDb();
  const userSnap = await db.collection("users").doc(targetUserId).get();
  if (!userSnap.exists) return null;

  const userData = userSnap.data()!;
  const storageUserIds = Array.from(
    new Set([userSnap.id, cleanAdminText(userData.firebaseUid)].filter(Boolean) as string[]),
  );

  return {
    snap: userSnap,
    data: userData,
    storageUserIds,
    firebaseUid: cleanAdminText(userData.firebaseUid),
    user: {
      id: userSnap.id,
      firebaseUid: cleanAdminText(userData.firebaseUid),
      email: cleanAdminText(userData.email),
      displayName: cleanAdminText(userData.displayName) || cleanAdminText(userData.username),
      firstName: cleanAdminText(userData.firstName),
      lastName: cleanAdminText(userData.lastName),
      photoURL: cleanAdminText(userData.photoURL),
    },
  };
}

export async function loadAdminTargetSubjects(targetUserId: string) {
  const target = await loadAdminTargetUser(targetUserId);
  if (!target) return null;
  const docs = await fetchUserSubjectDocs(target.storageUserIds);
  return {
    target,
    subjectDocs: docs,
    subjects: docs.map(normalizeSubjectDoc),
  };
}

export async function loadAdminTargetSubject(targetUserId: string, subjectId: string) {
  const loaded = await loadAdminTargetSubjects(targetUserId);
  if (!loaded) return null;
  const subjectDoc = loaded.subjectDocs.find(
    (doc) => cleanAdminText(doc.data().subjectId) === subjectId || doc.id === subjectId,
  );
  return subjectDoc ? { ...loaded, subjectDoc } : { ...loaded, subjectDoc: null };
}

export async function loadAdminSubjectHistory(subjectDoc: QueryDocumentSnapshot) {
  const subjectData = subjectDoc.data();
  const subjectId = cleanAdminText(subjectData.subjectId) || subjectDoc.id;
  const [fullLength, diagnostics, unitQuizzes] = await Promise.all([
    subjectDoc.ref.collection("fullLengthTests").orderBy("date", "asc").get(),
    subjectDoc.ref.collection("diagnosticTests").orderBy("date", "asc").get(),
    subjectDoc.ref.collection("unitQuizResults").orderBy("date", "asc").get(),
  ]);

  const combined = [
    ...fullLength.docs.map((doc) =>
      normalizeTest(doc, doc.data(), subjectId, "full-length"),
    ),
    ...diagnostics.docs.map((doc) =>
      normalizeTest(doc, doc.data(), subjectId, "diagnostic"),
    ),
    ...unitQuizzes.docs.map((doc) =>
      normalizeTest(doc, doc.data(), subjectId, "unit"),
    ),
  ].sort((a, b) => {
    const aMs = a.date ? new Date(a.date).getTime() : 0;
    const bMs = b.date ? new Date(b.date).getTime() : 0;
    return aMs - bMs;
  });

  return combined.map((test, index) => ({ ...test, testNumber: index + 1 }));
}

export async function loadAdminTargetTestHistory(targetUserId: string, subjectId?: string) {
  const loaded = await loadAdminTargetSubjects(targetUserId);
  if (!loaded) return null;
  const subjectDocs = subjectId
    ? loaded.subjectDocs.filter(
        (doc) => cleanAdminText(doc.data().subjectId) === subjectId || doc.id === subjectId,
      )
    : loaded.subjectDocs;
  const histories = await Promise.all(subjectDocs.map(loadAdminSubjectHistory));
  const combined = histories.flat().sort((a, b) => {
    const aMs = a.date ? new Date(a.date).getTime() : 0;
    const bMs = b.date ? new Date(b.date).getTime() : 0;
    return aMs - bMs;
  });
  return combined.map((test, index) => ({ ...test, testNumber: index + 1 }));
}

export async function loadAdminTargetDueReviews(
  targetUserId: string,
  subjectId?: string,
  limit = 500,
  unitId?: string,
) {
  const target = await loadAdminTargetUser(targetUserId);
  if (!target) return null;
  const dueUserId = target.firebaseUid || target.snap.id;
  return storage.getDueReviews(dueUserId, subjectId, limit, unitId);
}
