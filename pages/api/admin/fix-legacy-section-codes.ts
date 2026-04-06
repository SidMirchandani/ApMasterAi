import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectConfig } from "../../../server/subjects-helper";
import { getDb } from "../../../server/db";
import { isEnvAdminEmail, isPlatformAdmin } from "../../../server/platform-admin";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

type Block = { type: "text"; value: string } | { type: "image"; url: string };

/** Short scrape keys / old registry ids → canonical `SUBJECT_SECTIONS` codes. */
const LEGACY_TO_CANONICAL_BY_SUBJECT: Record<string, Record<string, string>> = {
  APMACRO: {
    BEC: "BEC",
    EI: "EIBC",
    NI: "NIPD",
    FS: "FS",
    LR: "LRCSP",
    OT: "OEITF",
  },
};

function assignSection(
  promptBlocks: Block[],
  choices: Record<string, Block[]>,
  sectionKeywords: Record<string, string[]>
): string {
  let text = "";
  for (const blk of promptBlocks) {
    if (blk.type === "text") text += " " + blk.value.toLowerCase();
  }
  for (const key of Object.keys(choices)) {
    for (const blk of choices[key]) {
      if (blk.type === "text") text += " " + blk.value.toLowerCase();
    }
  }

  const scores: Record<string, number> = {};
  for (const code of Object.keys(sectionKeywords)) {
    scores[code] = 0;
    for (const kw of sectionKeywords[code]) {
      if (text.includes(kw.toLowerCase())) scores[code]++;
    }
  }

  let bestCode = Object.keys(sectionKeywords)[0];
  let bestScore = 0;
  for (const code of Object.keys(scores)) {
    if (scores[code] > bestScore) {
      bestScore = scores[code];
      bestCode = code;
    }
  }
  return bestCode;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  const db = getDb();
  if (!decoded || !(await isPlatformAdmin(db, decoded.email, decoded.uid))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!isEnvAdminEmail(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const subjectCode = typeof req.body?.subjectCode === "string" ? req.body.subjectCode.trim().toUpperCase() : "";
  const legacyMap = subjectCode ? LEGACY_TO_CANONICAL_BY_SUBJECT[subjectCode] : undefined;
  if (!subjectCode || !legacyMap) {
    return res.status(400).json({
      error: "Unsupported or missing subjectCode",
      supported: Object.keys(LEGACY_TO_CANONICAL_BY_SUBJECT),
    });
  }

  const config = getSubjectConfig(subjectCode);
  if (!config) {
    return res.status(500).json({ error: `Config missing for ${subjectCode}` });
  }

  const validCodes = new Set(config.units.map((u) => u.id));

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  res.write(":" + " ".repeat(2048) + "\n\n");
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  sendEvent({
    type: "progress",
    message: `Fetching ${config.displayName} questions…`,
    current: 0,
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  });

  const snapshot = await firestore.collection("questions").where("subject_code", "==", subjectCode).get();
  const totalForSubject = snapshot.size;

  sendEvent({
    type: "progress",
    message: `Found ${totalForSubject} questions. Migrating legacy section codes…`,
    current: 0,
    total: totalForSubject,
    updated: 0,
    skipped: 0,
    errors: 0,
  });

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let idx = 0;

  const BATCH_SIZE = 50;
  let batch = firestore.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    idx++;
    const data = doc.data();
    const currentCode = typeof data.section_code === "string" ? data.section_code.trim() : "";

    let newCode: string | null = null;
    if (legacyMap[currentCode]) {
      newCode = legacyMap[currentCode];
    } else if (currentCode && validCodes.has(currentCode)) {
      totalSkipped++;
      continue;
    } else {
      const promptBlocks = (data.prompt_blocks || []) as Block[];
      const choices = (data.choices || {}) as Record<string, Block[]>;
      newCode = assignSection(promptBlocks, choices, config.sectionKeywords);
    }

    if (!newCode || newCode === currentCode) {
      totalSkipped++;
      continue;
    }

    if (!validCodes.has(newCode)) {
      totalSkipped++;
      continue;
    }

    const oldDocId = doc.id;
    const newDocId = oldDocId.replace(`_${currentCode}_`, `_${newCode}_`);

    try {
      if (newDocId !== oldDocId) {
        batch.set(
          firestore.collection("questions").doc(newDocId),
          {
            ...data,
            section_code: newCode,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        batch.delete(doc.ref);
        batchCount += 2;
      } else {
        batch.update(doc.ref, {
          section_code: newCode,
          updatedAt: new Date(),
        });
        batchCount++;
      }
      totalUpdated++;
    } catch (e: any) {
      sendEvent({ type: "error", message: `Doc ${doc.id}: ${e?.message || e}` });
      totalErrors++;
    }

    if (batchCount >= BATCH_SIZE) {
      try {
        await batch.commit();
      } catch (err: any) {
        sendEvent({ type: "error", message: `Batch commit failed: ${err.message}` });
        totalErrors++;
      }
      batch = firestore.batch();
      batchCount = 0;
    }

    if (idx % 20 === 0 || idx === totalForSubject) {
      sendEvent({
        type: "progress",
        message: `${config.displayName}: ${idx}/${totalForSubject}`,
        current: idx,
        total: totalForSubject,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: totalErrors,
      });
    }
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
    } catch (err: any) {
      sendEvent({ type: "error", message: `Final batch commit failed: ${err.message}` });
      totalErrors++;
    }
  }

  sendEvent({
    type: "complete",
    message: `Done. Updated ${totalUpdated} question(s); skipped ${totalSkipped}; errors ${totalErrors}.`,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors: totalErrors,
  });

  res.end();
}
