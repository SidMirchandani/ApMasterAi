import type { NextApiRequest, NextApiResponse } from "next";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import {
  recomputeUserStatsForUser,
  userHasUserStatsBackfillComplete,
} from "../../../server/user-stats";

const CHECKPOINT_DOC = "ops_backfill/user_stats";
const DEFAULT_CHUNK_SIZE = 100;
const MAX_CHUNK_SIZE = 300;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;
  const checkpointRef = firestore.doc(CHECKPOINT_DOC);
  if (req.method === "GET") {
    const snap = await checkpointRef.get();
    return res.status(200).json({ success: true, data: snap.exists ? snap.data() : null });
  }

  const mode = String(req.body?.mode || "resume").toLowerCase(); // resume | restart
  const dryRun = req.body?.dryRun === true;
  const ignoreBackfilled = req.body?.ignoreBackfilled === true;
  const chunkRaw = Number(req.body?.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const chunkSize = Math.max(1, Math.min(MAX_CHUNK_SIZE, Number.isFinite(chunkRaw) ? Math.floor(chunkRaw) : DEFAULT_CHUNK_SIZE));
  const maxUsersRaw = Number(req.body?.maxUsers ?? chunkSize);
  const maxUsers = Math.max(1, Number.isFinite(maxUsersRaw) ? Math.floor(maxUsersRaw) : chunkSize);

  try {
    const checkpointSnap = await checkpointRef.get();
    const checkpoint = checkpointSnap.exists ? checkpointSnap.data() || {} : {};
    const startCursor =
      mode === "restart"
        ? ""
        : typeof checkpoint.lastUid === "string"
          ? checkpoint.lastUid
          : "";

    let q = firestore.collection("users").orderBy(FieldPath.documentId()).limit(Math.min(chunkSize, maxUsers));
    if (startCursor) q = q.startAfter(startCursor);
    const usersSnap = await q.get();
    const t0 = Date.now();

    if (usersSnap.empty) {
      await checkpointRef.set(
        {
          status: "completed",
          lastUid: startCursor || null,
          processedCount: Number(checkpoint.processedCount || 0),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return res.status(200).json({ success: true, data: { processedThisRun: 0, status: "completed" } });
    }

    let processedThisRun = 0;
    let skippedThisRun = 0;
    const failedUids: string[] = [];
    let lastUid = startCursor;
    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      lastUid = uid;
      if (!ignoreBackfilled && userHasUserStatsBackfillComplete(userDoc.data())) {
        skippedThisRun += 1;
        continue;
      }
      try {
        if (!dryRun) {
          await recomputeUserStatsForUser(firestore, uid);
          await userDoc.ref.update({
            userStatsBackfilled: true,
            userStatsBackfilledAt: FieldValue.serverTimestamp(),
          });
        }
        processedThisRun += 1;
      } catch {
        failedUids.push(uid);
      }
    }

    const doneBatch = usersSnap.size < Math.min(chunkSize, maxUsers);
    await checkpointRef.set(
      {
        status: doneBatch ? "idle" : "running",
        lastUid,
        processedCount: Number(checkpoint.processedCount || 0) + processedThisRun,
        skippedCount: Number(checkpoint.skippedCount || 0) + skippedThisRun,
        updatedAt: new Date().toISOString(),
        startedAt: checkpoint.startedAt || new Date().toISOString(),
        failedUids,
      },
      { merge: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        mode,
        dryRun,
        ignoreBackfilled,
        processedThisRun,
        skippedThisRun,
        failedCount: failedUids.length,
        failedUids,
        lastUid,
        doneBatch,
        elapsedMs: Date.now() - t0,
      },
    });
  } catch (err: any) {
    await checkpointRef.set(
      {
        status: "failed",
        updatedAt: new Date().toISOString(),
        error: err?.message || "Unknown error",
      },
      { merge: true },
    );
    return res.status(500).json({ error: err.message });
  }
}

