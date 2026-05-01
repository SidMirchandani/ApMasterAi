import type { NextApiRequest, NextApiResponse } from "next";
import { FieldPath } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { getUserStatsDoc, recomputeUserStatsForUser } from "../../../server/user-stats";

const CHECKPOINT_DOC = "ops_reconcile/user_stats";
const DEFAULT_CHUNK_SIZE = 100;
const MAX_CHUNK_SIZE = 300;

type Mode = "check" | "repair";

function asNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function driftValue(actual: number, expected: number): number {
  return Math.abs(actual - expected);
}

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

  const modeRaw = String(req.body?.mode || "check").toLowerCase();
  const mode: Mode = modeRaw === "repair" ? "repair" : "check";
  const runMode = String(req.body?.runMode || "resume").toLowerCase(); // resume | restart
  const chunkRaw = Number(req.body?.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const chunkSize = Math.max(1, Math.min(MAX_CHUNK_SIZE, Number.isFinite(chunkRaw) ? Math.floor(chunkRaw) : DEFAULT_CHUNK_SIZE));
  const maxUsersRaw = Number(req.body?.maxUsers ?? chunkSize);
  const maxUsers = Math.max(1, Number.isFinite(maxUsersRaw) ? Math.floor(maxUsersRaw) : chunkSize);
  const driftThresholdRaw = Number(req.body?.driftThreshold ?? 0);
  const driftThreshold = Number.isFinite(driftThresholdRaw) ? Math.max(0, driftThresholdRaw) : 0;

  try {
    const checkpointSnap = await checkpointRef.get();
    const checkpoint = checkpointSnap.exists ? checkpointSnap.data() || {} : {};
    const startCursor =
      runMode === "restart"
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
          mode,
          lastUid: startCursor || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return res.status(200).json({ success: true, data: { checked: 0, repaired: 0, status: "completed" } });
    }

    let checked = 0;
    let repaired = 0;
    let mismatches = 0;
    let driftTotal = 0;
    const mismatchedUids: string[] = [];
    let lastUid = startCursor;

    for (const doc of usersSnap.docs) {
      if (checked >= maxUsers) break;
      const uid = doc.id;
      lastUid = uid;
      const existing = (await getUserStatsDoc(firestore, uid)) || {};
      const recomputed = await recomputeUserStatsForUser(firestore, uid, { persist: mode === "repair" });
      checked += 1;

      const courseDrift = driftValue(asNumber(existing.coursesEnrolledTotal), asNumber(recomputed.coursesEnrolledTotal));
      const questionsDrift = driftValue(asNumber(existing.questionsAnsweredTotal), asNumber(recomputed.questionsAnsweredTotal));
      const quizDrift = driftValue(asNumber(existing.quizzesTakenTotal), asNumber(recomputed.quizzesTakenTotal));
      const userDrift = courseDrift + questionsDrift + quizDrift;
      driftTotal += userDrift;
      const mismatch = userDrift > driftThreshold;
      if (mismatch) {
        mismatches += 1;
        mismatchedUids.push(uid);
        if (mode === "repair") repaired += 1;
      }
    }

    const doneBatch = usersSnap.size < Math.min(chunkSize, maxUsers);
    await checkpointRef.set(
      {
        status: doneBatch ? "idle" : "running",
        mode,
        lastUid,
        checkedCount: Number(checkpoint.checkedCount || 0) + checked,
        mismatchCount: Number(checkpoint.mismatchCount || 0) + mismatches,
        repairedCount: Number(checkpoint.repairedCount || 0) + repaired,
        driftTotal: Number(checkpoint.driftTotal || 0) + driftTotal,
        updatedAt: new Date().toISOString(),
        startedAt: checkpoint.startedAt || new Date().toISOString(),
      },
      { merge: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        mode,
        checked,
        mismatches,
        repaired,
        driftTotal,
        mismatchedUids,
        doneBatch,
        lastUid,
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

