/**
 * Sets `rand: Math.random()` on any `questions` document that is missing it (or has an
 * out-of-range value). This field powers efficient random sampling in /api/questions
 * (full-length exams and unit quizzes) so that questions without it are never invisible
 * to the `orderBy("rand")` queries.
 *
 *   npm run backfill:question-rand
 */
import "./load-dotenv-local";
import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../server/firebase-admin";

const CHUNK = 400;

function hasValidRand(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1;
}

async function main() {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin?.firestore) {
    throw new Error("Firebase Admin not initialized");
  }
  const fs = firebaseAdmin.firestore;

  let scanned = 0;
  let updated = 0;
  let last: QueryDocumentSnapshot | undefined;

  while (true) {
    let q = fs.collection("questions").orderBy(FieldPath.documentId()).limit(CHUNK);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    const batch = fs.batch();
    let batchWrites = 0;
    for (const doc of snap.docs) {
      scanned++;
      if (!hasValidRand(doc.data().rand)) {
        batch.set(doc.ref, { rand: Math.random() }, { merge: true });
        batchWrites++;
        updated++;
      }
    }
    if (batchWrites > 0) await batch.commit();

    last = snap.docs[snap.docs.length - 1];
    console.log(`[backfill-question-rand] scanned ${scanned}, updated ${updated}…`);
    if (snap.size < CHUNK) break;
  }

  console.log(`[backfill-question-rand] done. scanned ${scanned}, updated ${updated}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
