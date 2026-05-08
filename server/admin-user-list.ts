/**
 * Admin User Management list: eligibility (hide Firebase anon pseudonyms) and
 * indexed filter fields (prefix search on email / display name).
 */

import { FieldValue } from "firebase-admin/firestore";

export type AdminUserListSource = {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
};

/** Same identity check as legacy admin listing: `@firebase.user` pseudonyms excluded. */
export function deriveShowInAdminUserList(src: AdminUserListSource): boolean {
  const email = typeof src.email === "string" ? src.email.trim().toLowerCase() : "";
  const username = typeof src.username === "string" ? src.username.trim().toLowerCase() : "";
  const effective = (email || username || "").trim();
  if (!effective) return true;
  return !effective.endsWith("@firebase.user");
}

function lowercaseAlnumPrefixToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 500);
}

/**
 * Canonical mailbox for prefix queries: real-looking email only when user is eligible for admin list.
 */
export function deriveAdminEmailLower(src: AdminUserListSource): string | null {
  if (!deriveShowInAdminUserList(src)) return null;
  const raw =
    typeof src.email === "string" && src.email.includes("@")
      ? src.email
      : typeof src.username === "string" && src.username.includes("@")
        ? src.username
        : typeof src.email === "string"
          ? src.email
          : "";
  const e = raw.trim().toLowerCase();
  if (!e || e.endsWith("@firebase.user") || !e.includes("@")) return null;
  return e || null;
}

export function deriveAdminDisplayNameLower(src: AdminUserListSource): string | null {
  if (!deriveShowInAdminUserList(src)) return null;
  const dn =
    (typeof src.displayName === "string" && src.displayName.trim()) ||
    (typeof src.username === "string" && src.username.trim()) ||
    "";
  const s = lowercaseAlnumPrefixToken(dn);
  return s || null;
}

/** Fields to merge onto `users/{uid}` whenever profile identity changes. */
export function buildAdminUserListFields(src: AdminUserListSource): {
  showInAdminUserList: boolean;
  adminEmailLower: string | null;
  adminDisplayNameLower: string | null;
} {
  return {
    showInAdminUserList: deriveShowInAdminUserList(src),
    adminEmailLower: deriveAdminEmailLower(src),
    adminDisplayNameLower: deriveAdminDisplayNameLower(src),
  };
}

/** First document `set` — omit optional fields entirely when absent. */
export function attachAdminUserListForInitialSet(target: Record<string, unknown>, src: AdminUserListSource): void {
  const f = buildAdminUserListFields(src);
  target.showInAdminUserList = f.showInAdminUserList;
  if (f.adminEmailLower !== null && f.adminEmailLower !== "") target.adminEmailLower = f.adminEmailLower;
  if (f.adminDisplayNameLower !== null && f.adminDisplayNameLower !== "")
    target.adminDisplayNameLower = f.adminDisplayNameLower;
}

/** Mutates patch for Firestore `update` / `set(merge)` — clears optional fields when null. */
export function mergeAdminUserListIntoFirestorePatch(
  patch: Record<string, unknown>,
  src: AdminUserListSource,
): void {
  const f = buildAdminUserListFields(src);
  patch.showInAdminUserList = f.showInAdminUserList;
  if (f.adminEmailLower !== null && f.adminEmailLower !== "") patch.adminEmailLower = f.adminEmailLower;
  else patch.adminEmailLower = FieldValue.delete();
  if (f.adminDisplayNameLower !== null && f.adminDisplayNameLower !== "")
    patch.adminDisplayNameLower = f.adminDisplayNameLower;
  else patch.adminDisplayNameLower = FieldValue.delete();
}
