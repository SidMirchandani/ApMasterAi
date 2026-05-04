import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { isAdminEmailFromEnv } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { buildUserSearchFields } from "../../../server/user-search-fields";
import { getUserStatsBatch } from "../../../server/user-stats";

const SEARCH_CACHE_TTL_MS = 30_000;
const SCAN_BATCH_SIZE = 250;
const MAX_SCAN_DOCS = 4000;
const searchCache = new Map<string, { expiresAt: number; payload: unknown }>();

/** Cursor for orderBy(createdAt desc, documentId desc) — opaque to client. */
type AdminUsersCursorPayload =
  | { v: 1; kind: "ts"; seconds: number; nanoseconds: number; id: string }
  | { v: 1; kind: "str"; value: string; id: string };

function encodeUsersCursor(doc: QueryDocumentSnapshot): string {
  const data = doc.data();
  const ca = data.createdAt;
  let payload: AdminUsersCursorPayload;
  if (ca && typeof (ca as Timestamp).toMillis === "function") {
    const ts = ca as Timestamp;
    payload = { v: 1, kind: "ts", seconds: ts.seconds, nanoseconds: ts.nanoseconds, id: doc.id };
  } else if (ca != null && ca !== "") {
    payload = { v: 1, kind: "str", value: String(ca), id: doc.id };
  } else {
    payload = { v: 1, kind: "str", value: "", id: doc.id };
  }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeUsersCursor(raw: string): AdminUsersCursorPayload | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as AdminUsersCursorPayload;
    if (json?.v !== 1 || !json.id || (json.kind !== "ts" && json.kind !== "str")) return null;
    return json;
  } catch {
    return null;
  }
}

function applyDecodedCursor(query: Query, payload: AdminUsersCursorPayload): Query {
  if (payload.kind === "ts") {
    return query.startAfter(new Timestamp(payload.seconds, payload.nanoseconds), payload.id);
  }
  return query.startAfter(payload.value, payload.id);
}

function cacheGet<T>(key: string): T | null {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function cacheSet(key: string, payload: unknown) {
  searchCache.set(key, { payload, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
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
    const pageLimitRaw = Number(req.query.limit ?? 100);
    const limit = Math.max(1, Math.min(100, Number.isFinite(pageLimitRaw) ? Math.floor(pageLimitRaw) : 100));
    const cursorRaw = typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const cacheKey = `admin-users:v3:${limit}:${cursorRaw || "_"}:${q || "_"}`;
    const cached = cacheGet<{ success: true; data: unknown }>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }
    const t0 = Date.now();

    const users: {
      id: string;
      name: string | null;
      email: string;
      state: string | null;
      joinDate: string;
      lastLogin: string | null;
      totalCoursesEnrolled: number | null;
      status: "active" | "banned";
      isAdmin: boolean;
      hasEnvAdmin: boolean;
      hasDbAdmin: boolean;
    }[] = [];

    /** Furthest Firestore doc consumed (for client next page cursor). */
    let furthestCursor: string | null = null;
    let scanned = 0;
    let reachedEnd = false;
    const clientCursor = decodeUsersCursor(cursorRaw);
    let chainAfter: QueryDocumentSnapshot | null = null;

    while (users.length < limit && scanned < MAX_SCAN_DOCS) {
      let usersQuery: Query = firestore
        .collection("users")
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(SCAN_BATCH_SIZE);

      if (chainAfter) {
        usersQuery = usersQuery.startAfter(chainAfter);
      } else if (clientCursor) {
        usersQuery = applyDecodedCursor(usersQuery, clientCursor);
      }

      const usersSnap = await usersQuery.get();
      if (usersSnap.empty) {
        reachedEnd = true;
        break;
      }

      for (const doc of usersSnap.docs) {
        scanned += 1;
        furthestCursor = encodeUsersCursor(doc);

        const data = doc.data();
        const id = doc.id;
        const emailStr = String(data.email || data.username || "(no email)");
        if (emailStr.toLowerCase().endsWith("@firebase.user")) {
          if (users.length >= limit) break;
          continue;
        }
        const inferred =
          typeof data.inferredState === "string" && data.inferredState.trim() !== ""
            ? data.inferredState.trim()
            : null;
        const searchBlob =
          typeof data.searchBlob === "string" && data.searchBlob.trim()
            ? data.searchBlob.toLowerCase()
            : buildUserSearchFields({
                displayName:
                  typeof data.displayName === "string"
                    ? data.displayName
                    : typeof data.username === "string"
                      ? data.username
                      : null,
                username: typeof data.username === "string" ? data.username : null,
                email: emailStr,
                inferredState: inferred,
              }).searchBlob;
        if (q && !searchBlob.includes(q)) {
          if (users.length >= limit) break;
          continue;
        }
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        const joinDate = createdAt ? new Date(createdAt).toISOString() : "";
        const hasDbAdmin = data.isAdmin === true;
        const hasEnvAdmin = isAdminEmailFromEnv(emailStr);
        const isBanned = data.banned === true;
        users.push({
          id,
          name: data.displayName || data.username || null,
          email: emailStr,
          state: inferred,
          joinDate,
          lastLogin: null,
          totalCoursesEnrolled: null,
          status: isBanned ? "banned" : "active",
          isAdmin: hasEnvAdmin || hasDbAdmin,
          hasEnvAdmin,
          hasDbAdmin,
        });
        if (users.length >= limit) break;
      }

      chainAfter = usersSnap.docs[usersSnap.docs.length - 1] ?? null;

      if (usersSnap.size < SCAN_BATCH_SIZE) {
        reachedEnd = true;
        break;
      }
      if (users.length >= limit) break;
    }

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

    const payload = {
      success: true,
      data: {
        users: usersWithStats,
        pageSize: limit,
        nextCursor: users.length >= limit && !reachedEnd && furthestCursor ? furthestCursor : null,
        hasMore: users.length >= limit && !reachedEnd && Boolean(furthestCursor),
        metrics: {
          query: q,
          scanCount: scanned,
          elapsedMs: Date.now() - t0,
          reachedEnd,
        },
      },
    };
    cacheSet(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
