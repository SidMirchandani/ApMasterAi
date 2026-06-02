import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { NextApiRequest } from "next";
import type { IncomingHttpHeaders } from "node:http";
import { getClientIp } from "./client-ip";
import { lookupUsStateFromIpWithReason } from "./us-state-from-ip";
import { mergeAdminUserListIntoFirestorePatch } from "./admin-user-list";
import { buildUserSearchFields } from "./user-search-fields";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function timestampToMs(t: Timestamp | Date | undefined | null): number | null {
  if (t == null) return null;
  if (typeof (t as Timestamp).toMillis === "function") {
    return (t as Timestamp).toMillis();
  }
  return new Date(t as Date).getTime();
}

function hasValidInferredState(st: unknown): boolean {
  return typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim());
}

/**
 * Whether we should run a new GeoIP lookup.
 * - No state yet: retry at most once per day (faster recovery than 30d lockout).
 * - Has state: refresh at most once per 30 days from last successful inference.
 */
function shouldRunGeoLookup(opts: {
  hasState: boolean;
  lastAttemptMs: number | null;
  lastSuccessMs: number | null;
}): boolean {
  const { hasState, lastAttemptMs, lastSuccessMs } = opts;
  const now = Date.now();

  if (lastAttemptMs == null) {
    return true;
  }

  if (hasState) {
    const baseline = lastSuccessMs ?? lastAttemptMs;
    return now - baseline >= THIRTY_DAYS_MS;
  }

  return now - lastAttemptMs >= ONE_DAY_MS;
}

/**
 * Resolves US state from IP and updates Firestore.
 * Exported for user creation paths that only have a raw IP string (no Request).
 * Pass `headers` from the incoming request when available so Vercel geo headers are used (avoids geoip-lite on serverless).
 */
function normalizeInferredState(st: unknown): string | null {
  return hasValidInferredState(st) ? (st as string).trim().toUpperCase() : null;
}

/**
 * @param existingData Pre-fetched user document data. When provided, the internal
 *   `users/{userId}` read is skipped (the caller already has the doc).
 * @returns The inferred US state to use after any update (newly resolved state when a
 *   lookup just succeeded, otherwise the existing state), or null when unknown.
 */
export async function maybeUpdateUserGeoStateFromIp(
  firestore: Firestore,
  userId: string,
  ip: string | null,
  headers?: IncomingHttpHeaders,
  existingData?: Record<string, unknown> | null,
): Promise<string | null> {
  try {
    const ref = firestore.collection("users").doc(userId);
    let data: Record<string, unknown>;
    if (existingData !== undefined) {
      if (existingData === null) return null;
      data = existingData;
    } else {
      const snap = await ref.get();
      if (!snap.exists) return null;
      data = snap.data() ?? {};
    }
    const inferredState = data.inferredState;
    const hasState = hasValidInferredState(inferredState);

    const lastAttempt = data.lastIpGeoAttemptAt ?? data.lastIpGeoResolveAt;
    const lastSuccess = data.lastIpGeoSuccessAt;

    const lastAttemptMs = timestampToMs(lastAttempt as Timestamp | undefined);
    const lastSuccessMs = timestampToMs(lastSuccess as Timestamp | undefined);

    if (
      !shouldRunGeoLookup({
        hasState,
        lastAttemptMs,
        lastSuccessMs,
      })
    ) {
      return normalizeInferredState(inferredState);
    }

    const { state, reason, inferenceSource } = lookupUsStateFromIpWithReason(ip, headers);
    const now = FieldValue.serverTimestamp();

    const update: Record<string, unknown> = {
      lastIpGeoAttemptAt: now,
      lastIpGeoResolveAt: now,
    };

    if (state) {
      update.inferredState = state;
      update.inferenceSource = inferenceSource === "vercel_geo" ? "vercel_geo" : "ip";
      update.inferredStateAt = now;
      update.lastIpGeoSuccessAt = now;
    }
    const displayName =
      typeof data.displayName === "string"
        ? data.displayName
        : typeof data.username === "string"
          ? data.username
          : null;
    const email = typeof data.email === "string" ? data.email : null;
    const inferredStateForSearch =
      typeof update.inferredState === "string"
        ? update.inferredState
        : typeof data.inferredState === "string"
          ? data.inferredState
          : null;
    Object.assign(
      update,
      buildUserSearchFields({
        displayName,
        username: typeof data.username === "string" ? data.username : null,
        email,
        inferredState: inferredStateForSearch,
      }),
    );

    mergeAdminUserListIntoFirestorePatch(update, {
      email,
      username:
        typeof data.username === "string"
          ? data.username
          : typeof data.displayName === "string"
            ? data.displayName
            : null,
      displayName,
    });

    await ref.update(update);
    return (
      (typeof update.inferredState === "string" ? update.inferredState : null) ??
      normalizeInferredState(data.inferredState)
    );
  } catch (e) {
    console.warn("[maybeUpdateUserGeoStateFromIp]", e);
    return existingData ? normalizeInferredState(existingData.inferredState) : null;
  }
}

/**
 * Resolves US state from the request IP (see getClientIp).
 * Delegates to maybeUpdateUserGeoStateFromIp.
 */
export async function maybeUpdateUserGeoState(
  firestore: Firestore,
  userId: string,
  req: NextApiRequest,
  existingData?: Record<string, unknown> | null,
): Promise<string | null> {
  const ip = getClientIp(req);
  return maybeUpdateUserGeoStateFromIp(firestore, userId, ip, req.headers, existingData);
}
