import type { Firestore } from "firebase-admin/firestore";

/**
 * Bootstrap / break-glass admins from server env only (comma-separated emails).
 */
export function isAdminEmailFromEnv(email?: string | null): boolean {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(String(email).toLowerCase());
}

/**
 * True when the email is on ADMIN_EMAILS (break-glass). Prefer `isPlatformAdmin` for
 * authorization unless an operation must stay env-only (e.g. self-revoke safeguards).
 */
export function isEnvAdminEmail(email?: string | null): boolean {
  return isAdminEmailFromEnv(email);
}

/**
 * Platform admin: env list OR Firestore users/{uid}.isAdmin === true.
 */
export async function isPlatformAdmin(
  db: Firestore,
  email: string | null | undefined,
  uid: string | null | undefined,
): Promise<boolean> {
  if (isAdminEmailFromEnv(email)) return true;
  if (!uid) return false;
  try {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists && snap.data()?.isAdmin === true;
  } catch {
    return false;
  }
}
