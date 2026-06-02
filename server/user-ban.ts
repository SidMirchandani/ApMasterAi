import type { Firestore } from "firebase-admin/firestore";

// Short-lived in-memory cache of ban status to avoid 1-2 Firestore reads on every
// authenticated request. A banned user keeps access for at most BAN_CACHE_TTL_MS.
const BAN_CACHE_TTL_MS = 60 * 1000;
const banStatusCache = new Map<string, { banned: boolean; expiry: number }>();

/**
 * True if the Firebase user is banned in Firestore (by doc id or legacy firebaseUid field).
 * Results are cached briefly per uid.
 */
export async function isUserBanned(db: Firestore, firebaseUid: string): Promise<boolean> {
  const now = Date.now();
  const cached = banStatusCache.get(firebaseUid);
  if (cached && cached.expiry > now) return cached.banned;

  const banned = await resolveBanStatus(db, firebaseUid);
  banStatusCache.set(firebaseUid, { banned, expiry: now + BAN_CACHE_TTL_MS });
  return banned;
}

async function resolveBanStatus(db: Firestore, firebaseUid: string): Promise<boolean> {
  const direct = await db.collection("users").doc(firebaseUid).get();
  // Modern users are keyed by their Firebase uid, so the direct doc is authoritative;
  // only fall back to the legacy firebaseUid query when no such doc exists.
  if (direct.exists) return direct.data()?.banned === true;
  const legacy = await db
    .collection("users")
    .where("firebaseUid", "==", firebaseUid)
    .limit(10)
    .get();
  return legacy.docs.some((d) => d.data()?.banned === true);
}

/** Clears the cached ban status for a uid (call after banning/unbanning). */
export function invalidateBanStatusCache(firebaseUid?: string): void {
  if (firebaseUid) banStatusCache.delete(firebaseUid);
  else banStatusCache.clear();
}
