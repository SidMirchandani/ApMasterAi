/**
 * Clears geo throttle fields for users without a valid inferred US state so the next
 * authenticated API call (e.g. GET /api/user/me) retries IP inference immediately.
 *
 *   npm run backfill:inferred-state-retry
 *
 * Loads `.env.local` via `load-dotenv-local`. Requires Firebase Admin credentials.
 */
import "./load-dotenv-local";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../server/firebase-admin";

function hasValidInferredState(st: unknown): boolean {
  return typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim());
}

async function main() {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.error("Firebase Admin not initialized.");
    process.exit(1);
  }
  const { firestore } = admin;
  const snap = await firestore.collection("users").get();
  let updated = 0;
  let skipped = 0;
  const batchSize = 400;
  let batch = firestore.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (hasValidInferredState(data.inferredState)) {
      skipped++;
      continue;
    }
    batch.update(doc.ref, {
      lastIpGeoAttemptAt: FieldValue.delete(),
      lastIpGeoResolveAt: FieldValue.delete(),
      lastIpGeoSuccessAt: FieldValue.delete(),
    });
    updated++;
    ops++;
    if (ops >= batchSize) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
      console.log(`Committed batch… (${updated} resets so far)`);
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  console.log(`Done. Reset throttle for: ${updated}, skipped (already have state): ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
