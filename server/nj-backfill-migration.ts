import { FieldPath, FieldValue } from "firebase-admin/firestore";
import type { Firestore, Query } from "firebase-admin/firestore";

const MIGRATION_DOC = "backfill_user_states_nj";
const MIGRATIONS_COLLECTION = "platform_migrations";
/** Users read per admin insights request (avoids Vercel timeouts on large DBs). */
const CHUNK = 200;

/**
 * Idempotent NJ placeholder for users missing inferredState.
 * Paginates the entire `users` collection once, a chunk per call, until `completed`.
 * Triggered automatically from GET /api/admin/insights (admin-only).
 */
export async function runNjBackfillChunkIfNeeded(firestore: Firestore): Promise<void> {
  const ref = firestore.collection(MIGRATIONS_COLLECTION).doc(MIGRATION_DOC);
  const stateSnap = await ref.get();
  if (stateSnap.data()?.completed === true) return;

  let q: Query = firestore.collection("users").orderBy(FieldPath.documentId()).limit(CHUNK);
  const cursor = stateSnap.data()?.cursor as string | undefined;
  if (cursor) {
    q = q.startAfter(cursor);
  }

  const userSnap = await q.get();

  if (userSnap.empty) {
    await ref.set(
      {
        completed: true,
        cursor: FieldValue.delete(),
        completedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  let batch = firestore.batch();
  let batchOps = 0;
  for (const doc of userSnap.docs) {
    const d = doc.data();
    if (d.inferredState != null && String(d.inferredState).trim() !== "") continue;

    batch.update(doc.ref, {
      inferredState: "NJ",
      inferenceSource: "backfill_nj",
      inferredStateAt: FieldValue.serverTimestamp(),
    });
    batchOps++;
    if (batchOps >= 400) {
      await batch.commit();
      batch = firestore.batch();
      batchOps = 0;
    }
  }
  if (batchOps > 0) {
    await batch.commit();
  }

  const lastId = userSnap.docs[userSnap.docs.length - 1]!.id;
  const isLastPage = userSnap.size < CHUNK;

  if (isLastPage) {
    await ref.set(
      {
        completed: true,
        cursor: FieldValue.delete(),
        completedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await ref.set(
      {
        cursor: lastId,
        completed: false,
        lastChunkAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}
