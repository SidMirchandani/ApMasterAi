/**
 * Demo / QA: assign inferred US state on Firestore `users` for the admin "Users by Region" chart.
 * Distribution (first 41 users after shuffle): NJ×21, CA×10 (California), GA×5 (Atlanta), IL×5 (Chicago).
 * Any additional users get round-robin NJ, CA, GA, IL so inferredState is never empty (avoids NJ backfill rewriting).
 *
 *   npm run seed:demo-user-regions
 *
 * Loads `.env.local` via `load-dotenv-local` (plain `tsx` does not read it like Next.js).
 * Requires Firebase Admin credentials (e.g. FIREBASE_SERVICE_ACCOUNT_KEY in .env.local).
 */
import "./load-dotenv-local";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../server/firebase-admin";

const PRIMARY_QUOTA: { code: string; label: string; n: number }[] = [
  { code: "NJ", label: "New Jersey", n: 21 },
  { code: "CA", label: "California", n: 10 },
  { code: "GA", label: "Georgia (Atlanta)", n: 5 },
  { code: "IL", label: "Illinois (Chicago)", n: 5 },
];

const ROTATE = PRIMARY_QUOTA.map((q) => q.code);

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildAssignmentOrder(totalUsers: number): string[] {
  const order: string[] = [];
  let assigned = 0;
  for (const { code, n } of PRIMARY_QUOTA) {
    for (let k = 0; k < n && assigned < totalUsers; k++) {
      order.push(code);
      assigned++;
    }
  }
  let r = 0;
  while (assigned < totalUsers) {
    order.push(ROTATE[r % ROTATE.length]!);
    r++;
    assigned++;
  }
  return order;
}

async function main() {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.error("Firebase Admin not initialized.");
    process.exit(1);
  }
  const { firestore } = admin;

  const snap = await firestore.collection("users").get();
  if (snap.empty) {
    console.log("No users in collection.");
    return;
  }

  const docs = [...snap.docs];
  shuffleInPlace(docs);
  const codes = buildAssignmentOrder(docs.length);

  const batchSize = 400;
  let batch = firestore.batch();
  let ops = 0;

  for (let i = 0; i < docs.length; i++) {
    const code = codes[i]!;
    batch.update(docs[i]!.ref, {
      inferredState: code,
      inferenceSource: "demo_seed_regions",
      inferredStateAt: FieldValue.serverTimestamp(),
    });
    ops++;
    if (ops >= batchSize) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
      console.log(`Committed batch… (${i + 1} / ${docs.length})`);
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  const counts: Record<string, number> = {};
  for (const c of codes) {
    counts[c] = (counts[c] || 0) + 1;
  }

  console.log(`Done. Updated ${docs.length} users.`);
  console.log("Counts:", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
