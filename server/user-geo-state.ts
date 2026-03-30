import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { NextApiRequest } from "next";
import { getClientIp } from "./client-ip";
import { lookupUsStateFromIp } from "./us-state-from-ip";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function shouldRunGeoLookup(lastResolve: Timestamp | Date | undefined | null): boolean {
  if (lastResolve == null) return true;
  const ms =
    typeof (lastResolve as Timestamp).toMillis === "function"
      ? (lastResolve as Timestamp).toMillis()
      : new Date(lastResolve as Date).getTime();
  return Date.now() - ms >= THIRTY_DAYS_MS;
}

/**
 * Resolves US state from IP at most once per 30 days per user.
 * Always sets lastIpGeoResolveAt on attempt (success or failure) to avoid retry storms.
 */
export async function maybeUpdateUserGeoState(
  firestore: Firestore,
  userId: string,
  req: NextApiRequest
): Promise<void> {
  try {
    const ref = firestore.collection("users").doc(userId);
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data() ?? {};
    const last = data.lastIpGeoResolveAt as Timestamp | undefined;
    if (!shouldRunGeoLookup(last)) return;

    const ip = getClientIp(req);
    const state = lookupUsStateFromIp(ip);
    const now = FieldValue.serverTimestamp();

    const update: Record<string, unknown> = {
      lastIpGeoResolveAt: now,
    };

    if (state) {
      update.inferredState = state;
      update.inferenceSource = "ip";
      update.inferredStateAt = now;
    }

    await ref.update(update);
  } catch (e) {
    console.warn("[maybeUpdateUserGeoState]", e);
  }
}
