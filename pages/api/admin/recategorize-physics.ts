import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getSubjectConfig } from "../../../server/subjects-helper";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function isAllowed(email?: string | null) {
  const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

type Block = { type: "text"; value: string } | { type: "image"; url: string };

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

const OLD_TO_NEW_PHYS1: Record<string, string> = {
  DYN: "FTD",
  WKE: "WEP",
  LMOM: "LMO",
  EMRS: "EMR",
  CMG: "FTD",
  ENR: "WEP",
  MOM: "LMO",
  SHM: "OSC",
  TRM: "TRD",
};

const OLD_TO_NEW_PHYS2: Record<string, string> = {
  QAN: "MOD",
};

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
  if (!decoded || !isAllowed(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

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

  const subjects = ["APPHYS1", "APPHYS2"];
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalProcessed = 0;

  for (const subjectCode of subjects) {
    const config = getSubjectConfig(subjectCode);
    if (!config) continue;

    const oldToNew = subjectCode === "APPHYS1" ? OLD_TO_NEW_PHYS1 : OLD_TO_NEW_PHYS2;
    const validCodes = new Set(config.units.map(u => u.id));

    sendEvent({
      type: "progress",
      message: `Fetching ${config.displayName} questions...`,
      current: totalProcessed,
      total: 0,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: totalErrors,
    });

    const snapshot = await firestore
      .collection("questions")
      .where("subject_code", "==", subjectCode)
      .get();

    const totalForSubject = snapshot.size;

    sendEvent({
      type: "progress",
      message: `Found ${totalForSubject} questions for ${config.displayName}. Recategorizing...`,
      current: 0,
      total: totalForSubject,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: totalErrors,
    });

    const BATCH_SIZE = 50;
    let batch = firestore.batch();
    let batchCount = 0;
    let subjectIdx = 0;

    for (const doc of snapshot.docs) {
      subjectIdx++;
      totalProcessed++;
      const data = doc.data();
      const currentCode = data.section_code;

      let newCode: string | null = null;

      if (oldToNew[currentCode]) {
        newCode = oldToNew[currentCode];
      }

      if (!validCodes.has(currentCode) && !newCode) {
        const promptBlocks = data.prompt_blocks || [];
        const choices = data.choices || {};
        newCode = assignSection(promptBlocks, choices, config.sectionKeywords);
      }

      if (newCode && newCode !== currentCode) {
        const oldDocId = doc.id;
        const newDocId = oldDocId.replace(`_${currentCode}_`, `_${newCode}_`);

        if (newDocId !== oldDocId) {
          batch.set(firestore.collection("questions").doc(newDocId), {
            ...data,
            section_code: newCode,
            updatedAt: new Date(),
          });
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
      } else {
        totalSkipped++;
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

      if (subjectIdx % 10 === 0 || subjectIdx === totalForSubject) {
        sendEvent({
          type: "progress",
          message: `${config.displayName}: ${subjectIdx}/${totalForSubject} processed`,
          current: subjectIdx,
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
  }

  sendEvent({
    type: "complete",
    message: `Recategorization complete! Updated ${totalUpdated} questions, skipped ${totalSkipped}, errors ${totalErrors}.`,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors: totalErrors,
  });

  res.end();
}
