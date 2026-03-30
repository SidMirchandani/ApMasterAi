/**
 * Optional manual full backfill (same data as automatic migration).
 * Production: opening Admin → Insights runs chunked backfill in the API (no script needed).
 * Use this locally if you want everything in one run:
 *   npx tsx scripts/backfill-user-states-nj.ts
 * Requires Firebase Admin credentials.
 */
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../server/firebase-admin";

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
    const existing = data.inferredState;
    if (existing != null && String(existing).trim() !== "") {
      skipped++;
      continue;
    }
    batch.update(doc.ref, {
      inferredState: "NJ",
      inferenceSource: "backfill_nj",
      inferredStateAt: FieldValue.serverTimestamp(),
    });
    updated++;
    ops++;
    if (ops >= batchSize) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
      console.log(`Committed batch… (${updated} updates so far)`);
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  console.log(`Done. Updated: ${updated}, skipped (already had state): ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
