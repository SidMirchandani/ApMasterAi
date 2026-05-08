/**
 * Writes `showInAdminUserList`, `adminEmailLower`, `adminDisplayNameLower`, `banned: false`,
 * and `isAdmin: false` when missing — required for indexed admin queries.
 *
 *   npm run backfill:admin-user-list
 */
import "./load-dotenv-local";
import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { mergeAdminUserListIntoFirestorePatch } from "../server/admin-user-list";
import { getFirebaseAdmin } from "../server/firebase-admin";

const CHUNK = 400;

async function main() {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin?.firestore) {
    throw new Error("Firebase Admin not initialized");
  }
  const fs = firebaseAdmin.firestore;

  let processed = 0;
  let last: QueryDocumentSnapshot | undefined;

  while (true) {
    let q = fs.collection("users").orderBy(FieldPath.documentId()).limit(CHUNK);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    const batch = fs.batch();
    for (const doc of snap.docs) {
      const data = doc.data();
      const email = typeof data.email === "string" ? data.email : "";
      const username =
        typeof data.username === "string"
          ? data.username
          : typeof data.displayName === "string"
            ? data.displayName
            : "";
      const displayName = typeof data.displayName === "string" ? data.displayName : username;
      const patch: Record<string, unknown> = {};
      mergeAdminUserListIntoFirestorePatch(patch, {
        email: email || null,
        username: username || null,
        displayName: displayName || null,
      });
      if (data.banned === undefined || data.banned === null) {
        patch.banned = false;
      }
      if (data.isAdmin === undefined || data.isAdmin === null) {
        patch.isAdmin = false;
      }
      batch.set(doc.ref, patch, { merge: true });
      processed++;
    }
    await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    console.log(`[backfill-admin-user-list] merged ${processed} users…`);
    if (snap.size < CHUNK) break;
  }
  console.log(`[backfill-admin-user-list] done, total writes (docs touched): ${processed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
