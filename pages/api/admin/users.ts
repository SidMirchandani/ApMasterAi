import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type {
  DocumentData,
  DocumentSnapshot,
  Firestore,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { isAdminEmailFromEnv } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { deriveShowInAdminUserList } from "../../../server/admin-user-list";
import { getUserStatsBatch } from "../../../server/user-stats";

const CACHE_TTL_MS = 30_000;
/** Single-field orderBy only — uses Firestore automatic indexes; filtering is in-memory. */
const SCAN_BATCH = 250;
const MAX_SCAN = 8000;

const responseCache = new Map<string, { expiresAt: number; payload: unknown }>();

type ListMode =
  | { kind: "browse" }
  | { kind: "emailPrefix"; prefix: string }
  | { kind: "namePrefix"; prefix: string }
  | { kind: "state"; code: string }
  | { kind: "status"; banned: boolean }
  | { kind: "joined"; from: Timestamp | null; to: Timestamp | null }
  | { kind: "dbAdmin"; isDbAdmin: boolean };

function normalizeQueryString(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function parseIsoToTimestampBoundary(isoRaw: string, endOfDay: boolean): Timestamp | null {
  const s = isoRaw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  if (endOfDay) {
    const x = new Date(d);
    x.setUTCHours(23, 59, 59, 999);
    return Timestamp.fromDate(x);
  }
  return Timestamp.fromDate(d);
}

function parseFilterMode(query: NextApiRequest["query"]):
  | { ok: true; mode: ListMode }
  | { ok: false; error: string } {
  const qParam = normalizeQueryString(query.q);
  if (qParam) return { ok: false, error: "Remove legacy q parameter; use a single column filter." };

  const emailPrefix = normalizeQueryString(query.filterEmailPrefix).toLowerCase().replace(/\s+/g, " ");
  const namePrefix = normalizeQueryString(query.filterNamePrefix).toLowerCase().replace(/\s+/g, " ");
  const stateRaw = normalizeQueryString(query.filterState).toUpperCase();
  const statusRaw = normalizeQueryString(query.filterStatus).toLowerCase();
  const joinFrom = normalizeQueryString(query.filterJoinFrom);
  const joinTo = normalizeQueryString(query.filterJoinTo);
  const dbAdminRaw = normalizeQueryString(query.filterDbAdmin).toLowerCase();

  const picks: string[] = [];
  if (emailPrefix) picks.push("email");
  if (namePrefix) picks.push("name");
  if (stateRaw) picks.push("state");
  if (statusRaw) picks.push("status");
  if (joinFrom || joinTo) picks.push("joined");
  if (dbAdminRaw === "true" || dbAdminRaw === "false") picks.push("dbAdmin");

  if (picks.length > 1) {
    return { ok: false, error: "Only one column filter allowed per request (mutex)." };
  }
  if (!picks.length) return { ok: true, mode: { kind: "browse" } };

  if (emailPrefix) {
    return { ok: true, mode: { kind: "emailPrefix", prefix: emailPrefix.slice(0, 500) } };
  }
  if (namePrefix) {
    return { ok: true, mode: { kind: "namePrefix", prefix: namePrefix.slice(0, 500) } };
  }
  if (stateRaw) {
    if (!/^[A-Z]{2}$/.test(stateRaw)) {
      return { ok: false, error: "filterState must be a 2-letter US state code." };
    }
    return { ok: true, mode: { kind: "state", code: stateRaw } };
  }
  if (statusRaw) {
    if (statusRaw === "active") return { ok: true, mode: { kind: "status", banned: false } };
    if (statusRaw === "banned") return { ok: true, mode: { kind: "status", banned: true } };
    return { ok: false, error: "filterStatus must be active or banned." };
  }
  if (joinFrom || joinTo) {
    const fromTs = joinFrom ? parseIsoToTimestampBoundary(joinFrom, false) : null;
    const toTsRaw = parseIsoToTimestampBoundary(joinTo, true);
    const toTs = joinTo ? toTsRaw : null;
    if (joinFrom && !fromTs) return { ok: false, error: "filterJoinFrom must be a valid ISO date." };
    if (joinTo && !toTs) return { ok: false, error: "filterJoinTo must be a valid ISO date." };
    if (fromTs && toTs && fromTs.toMillis() > toTs.toMillis()) {
      return { ok: false, error: "filterJoinFrom must be <= filterJoinTo." };
    }
    return {
      ok: true,
      mode: {
        kind: "joined",
        from: fromTs,
        to: toTs,
      },
    };
  }
  if (dbAdminRaw === "true") return { ok: true, mode: { kind: "dbAdmin", isDbAdmin: true } };
  return { ok: true, mode: { kind: "dbAdmin", isDbAdmin: false } };
}

/** Opaque cursor: last scanned user doc ID in signed-up-newest-first stream ({@link scanUsersPage}). */
type ScanCursorPayload = { v: 5; id: string };

function encodeScanCursor(doc: QueryDocumentSnapshot): string {
  const payload: ScanCursorPayload = { v: 5, id: doc.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursorDocId(raw: string): string | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, unknown>;
    if (j.v === 5 && typeof j.id === "string" && j.id) return j.id;
    if (j.branch === "email" && typeof j.id === "string") return j.id;
    if (j.branch === "name" && typeof j.id === "string") return j.id;
    if (j.branch === "ca" && j.payload && typeof (j.payload as { id?: string }).id === "string") {
      return (j.payload as { id: string }).id;
    }
    const legacy = j as { v?: number; id?: string; kind?: string };
    if (legacy?.v === 1 && typeof legacy.id === "string") return legacy.id;
    return null;
  } catch {
    return null;
  }
}

async function loadCursorSnapshot(
  firestore: Firestore,
  cursorRaw: string,
): Promise<DocumentSnapshot | null> {
  const id = decodeCursorDocId(cursorRaw);
  if (!id) return null;
  const snap = await firestore.collection("users").doc(id).get();
  return snap.exists ? snap : null;
}

function cacheGet<T>(key: string): T | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function cacheSet(key: string, payload: unknown) {
  responseCache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
}

type RowOut = {
  id: string;
  name: string | null;
  email: string;
  state: string | null;
  joinDate: string;
  lastLogin: string | null;
  totalCoursesEnrolled: number | null;
  /** From `firstTouchAttribution.referral` (marketing / partner referral tag). */
  referralAttribution: string | null;
  status: "active" | "banned";
  isAdmin: boolean;
  hasEnvAdmin: boolean;
  hasDbAdmin: boolean;
};

function referralFromUserDoc(data: DocumentData): string | null {
  const ft = data.firstTouchAttribution;
  if (ft == null || typeof ft !== "object" || Array.isArray(ft)) return null;
  const r = (ft as { referral?: unknown }).referral;
  if (typeof r !== "string") return null;
  const t = r.trim();
  return t || null;
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

function normalizeNameLower(data: DocumentData): string {
  if (typeof data.adminDisplayNameLower === "string" && data.adminDisplayNameLower.trim()) {
    return data.adminDisplayNameLower.trim().toLowerCase();
  }
  const s =
    (typeof data.displayName === "string" && data.displayName.trim()) ||
    (typeof data.username === "string" && data.username.trim()) ||
    "";
  return s.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 500);
}

function effectiveEmailLower(data: DocumentData): string {
  if (typeof data.adminEmailLower === "string" && data.adminEmailLower.trim()) {
    return data.adminEmailLower.trim().toLowerCase();
  }
  const e = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (e) return e;
  const u = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
  return u.includes("@") ? u : "";
}

function docCreatedMillis(data: DocumentData): number | null {
  const ca = data.createdAt;
  if (ca && typeof (ca as Timestamp).toMillis === "function") {
    return (ca as Timestamp).toMillis();
  }
  if (ca != null && ca !== "") {
    const t = new Date(String(ca)).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function buildModePredicate(mode: ListMode): (data: DocumentData) => boolean {
  return (data: DocumentData) => {
    if (!isDocEligibleForAdminBrowse(data)) return false;
    switch (mode.kind) {
      case "browse":
        return true;
      case "emailPrefix":
        return effectiveEmailLower(data).startsWith(mode.prefix);
      case "namePrefix":
        return normalizeNameLower(data).startsWith(mode.prefix);
      case "state": {
        const st =
          typeof data.inferredState === "string" && data.inferredState.trim()
            ? data.inferredState.trim().toUpperCase()
            : null;
        return st === mode.code;
      }
      case "status":
        return (data.banned === true) === mode.banned;
      case "joined": {
        const ms = docCreatedMillis(data);
        if (ms == null) return false;
        if (mode.from && ms < mode.from.toMillis()) return false;
        if (mode.to && ms > mode.to.toMillis()) return false;
        return true;
      }
      case "dbAdmin":
        return (data.isAdmin === true) === mode.isDbAdmin;
      default:
        return false;
    }
  };
}

function mapDoc(doc: QueryDocumentSnapshot): RowOut {
  const data = doc.data();
  const id = doc.id;
  const emailStr = String(data.email || data.username || "(no email)");
  const inferred =
    typeof data.inferredState === "string" && data.inferredState.trim() !== ""
      ? data.inferredState.trim()
      : null;
  const createdAtVal = data.createdAt?.toDate?.() ?? data.createdAt;
  const joinDate = createdAtVal ? new Date(createdAtVal as Date).toISOString() : "";
  const hasDbAdmin = data.isAdmin === true;
  const hasEnvAdmin = isAdminEmailFromEnv(emailStr);
  const isBanned = data.banned === true;
  return {
    id,
    name: data.displayName || data.username || null,
    email: emailStr,
    state: inferred,
    joinDate,
    lastLogin: null,
    totalCoursesEnrolled: null,
    referralAttribution: referralFromUserDoc(data),
    status: isBanned ? "banned" : "active",
    isAdmin: hasEnvAdmin || hasDbAdmin,
    hasEnvAdmin,
    hasDbAdmin,
  };
}

async function scanUsersPage(params: {
  firestore: Firestore;
  limit: number;
  cursorRaw: string;
  predicate: (data: DocumentData) => boolean;
}): Promise<{
  users: RowOut[];
  scanCount: number;
  reachedEnd: boolean;
  nextCursorEncoded: string | null;
}> {
  const { firestore, limit, cursorRaw, predicate } = params;
  const col = firestore.collection("users");

  let chainAfterDoc: DocumentSnapshot | null = await loadCursorSnapshot(
    firestore,
    cursorRaw,
  );

  const users: RowOut[] = [];
  let scanned = 0;
  let reachedEnd = false;
  let furthestCursorEncoded: string | null = null;

  while (users.length < limit && scanned < MAX_SCAN) {
    let q = col.orderBy("createdAt", "desc").limit(SCAN_BATCH);
    if (chainAfterDoc) {
      q = q.startAfter(chainAfterDoc);
    }

    const snap = await q.get();
    chainAfterDoc = null;

    if (snap.empty) {
      reachedEnd = true;
      break;
    }

    for (const doc of snap.docs) {
      scanned += 1;
      furthestCursorEncoded = encodeScanCursor(doc);

      const data = doc.data();
      if (!predicate(data)) {
        continue;
      }
      users.push(mapDoc(doc));
      if (users.length >= limit) break;
    }

    chainAfterDoc = snap.docs[snap.docs.length - 1] ?? null;

    if (snap.size < SCAN_BATCH) {
      reachedEnd = true;
      break;
    }
    if (users.length >= limit) break;
  }

  const nextCursorEncoded =
    users.length >= limit && !reachedEnd && furthestCursorEncoded ? furthestCursorEncoded : null;

  return {
    users,
    scanCount: scanned,
    reachedEnd,
    nextCursorEncoded,
  };
}

function modeCacheLabel(mode: ListMode): string {
  switch (mode.kind) {
    case "browse":
      return "browse";
    case "emailPrefix":
      return `email:${mode.prefix}`;
    case "namePrefix":
      return `name:${mode.prefix}`;
    case "state":
      return `state:${mode.code}`;
    case "status":
      return mode.banned ? "status:banned" : "status:active";
    case "joined":
      return `joined:${mode.from?.toMillis() ?? "x"}-${mode.to?.toMillis() ?? "x"}`;
    case "dbAdmin":
      return mode.isDbAdmin ? "dbAdmin:1" : "dbAdmin:0";
    default:
      return "browse";
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

  const parsed = parseFilterMode(req.query);
  if (parsed.ok === false) {
    return res.status(400).json({ error: parsed.error });
  }
  const { mode } = parsed;

  try {
    const pageLimitRaw = Number(req.query.limit ?? 100);
    const limit = Math.max(1, Math.min(100, Number.isFinite(pageLimitRaw) ? Math.floor(pageLimitRaw) : 100));
    const cursorRaw = typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";
    const cacheKey = `admin-users:v5-scan:${modeCacheLabel(mode)}:${limit}:${cursorRaw || "_"}`;
    const cached = cacheGet<{ success: true; data: unknown }>(cacheKey);
    if (cached) return res.status(200).json(cached);

    const t0 = Date.now();
    const predicate = buildModePredicate(mode);

    const { users, scanCount, reachedEnd, nextCursorEncoded } = await scanUsersPage({
      firestore,
      limit,
      cursorRaw,
      predicate,
    });

    const statsByUser = await getUserStatsBatch(
      firestore,
      users.map((u) => u.id),
    );
    const usersWithStats = users.map((u) => ({
      ...u,
      totalCoursesEnrolled:
        typeof statsByUser.get(u.id)?.coursesEnrolledTotal === "number"
          ? Number(statsByUser.get(u.id)?.coursesEnrolledTotal)
          : null,
    }));

    const hasMore = Boolean(nextCursorEncoded);

    const payload = {
      success: true,
      data: {
        users: usersWithStats,
        pageSize: limit,
        nextCursor: nextCursorEncoded,
        hasMore,
        metrics: {
          filterMode: modeCacheLabel(mode),
          scanCount,
          elapsedMs: Date.now() - t0,
          reachedEnd,
        },
      },
    };
    cacheSet(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
}
