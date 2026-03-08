import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { uploadImageFromUrl, isFirebaseStorageUrl } from "../../../server/upload-image-from-url";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

type Block = { type: "text"; value: string } | { type: "image"; url: string };

function isAllowed(email?: string | null) {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const allow = adminEmails.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

function getBlocksFromQuestion(data: any): { blocks: Block[]; key: string }[] {
  const out: { blocks: Block[]; key: string }[] = [];
  if (data.prompt_blocks && Array.isArray(data.prompt_blocks)) {
    out.push({ blocks: data.prompt_blocks, key: "prompt" });
  }
  if (data.choices && typeof data.choices === "object" && !Array.isArray(data.choices)) {
    for (const letter of ["A", "B", "C", "D", "E"]) {
      const blocks = data.choices[letter];
      if (blocks && Array.isArray(blocks)) {
        out.push({ blocks, key: `choice_${letter}` });
      }
    }
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = await verifyFirebaseToken(authHeader.slice(7));
    if (!isAllowed(decoded.email)) {
      return res.status(403).json({ error: "Not authorized" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { subjectCode } = req.body || {};

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

  const padding = " ".repeat(2048) + "\n";
  res.write(padding);

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  const sendEvent = (data: any) => {
    if (aborted) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch {}
  };

  try {
    sendEvent({
      type: "progress",
      message: "Scanning questions for external images...",
      current: 0,
      total: 0,
      questions_processed: 0,
      images_migrated: 0,
      failed: 0,
    });

    let query = firestore.collection("questions") as FirebaseFirestore.Query;
    if (subjectCode) {
      query = query.where("subject_code", "==", subjectCode);
    }

    const snapshot = await query.get();
    const totalQuestions = snapshot.size;

    sendEvent({
      type: "progress",
      message: `Found ${totalQuestions} questions. Migrating external images to Firebase...`,
      current: 0,
      total: totalQuestions,
      questions_processed: 0,
      images_migrated: 0,
      failed: 0,
    });

    let questionsProcessed = 0;
    let imagesMigrated = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
      if (aborted) break;

      const data = doc.data();
      const subject = data.subject_code;
      const rawId = doc.id.split("_Q")[1];
      const questionId =
        typeof data.question_id === "number"
          ? data.question_id
          : (rawId ? parseInt(rawId, 10) : 0) || 0;
      const ref = doc.ref;

      const blockSources = getBlocksFromQuestion(data);
      let docDirty = false;
      const updates: Record<string, any> = {};
      if (data.choices && typeof data.choices === "object") {
        updates.choices = { ...data.choices };
      }

      for (const { blocks, key } of blockSources) {
        const newBlocks: Block[] = [];
        let imageIndex = 0;
        for (const block of blocks) {
          if (block.type === "image" && block.url) {
            if (isFirebaseStorageUrl(block.url)) {
              newBlocks.push(block);
            } else {
              try {
                const firebaseUrl = await uploadImageFromUrl(
                  block.url,
                  subject,
                  questionId,
                  `${key}_${imageIndex}`
                );
                newBlocks.push({ type: "image", url: firebaseUrl });
                imagesMigrated++;
                docDirty = true;
              } catch (err: any) {
                console.error("Upload failed:", block.url, err.message);
                newBlocks.push(block);
                failed++;
              }
              imageIndex++;
            }
          } else {
            newBlocks.push(block);
          }
        }
        if (key === "prompt") {
          updates.prompt_blocks = newBlocks;
        } else {
          const letter = key.replace("choice_", "");
          if (updates.choices) updates.choices[letter] = newBlocks;
        }
      }

      if (docDirty) {
        const payload: Record<string, any> = {};
        if (updates.prompt_blocks) payload.prompt_blocks = updates.prompt_blocks;
        if (updates.choices && Object.keys(updates.choices).length) payload.choices = updates.choices;
        if (Object.keys(payload).length > 0) await ref.update(payload);
      }
      questionsProcessed++;

      sendEvent({
        type: "progress",
        message: `Processed ${questionsProcessed}/${totalQuestions} questions`,
        current: questionsProcessed,
        total: totalQuestions,
        questions_processed: questionsProcessed,
        images_migrated: imagesMigrated,
        failed,
      });
    }

    sendEvent({
      type: "complete",
      message: `Done! Processed ${questionsProcessed} questions, migrated ${imagesMigrated} images to Firebase (${failed} failed).`,
      current: questionsProcessed,
      total: totalQuestions,
      questions_processed: questionsProcessed,
      images_migrated: imagesMigrated,
      failed,
    });
  } catch (error: any) {
    console.error("Migrate external images error:", error);
    sendEvent({
      type: "error",
      message: error.message || "Migration failed",
    });
  }

  res.end();
}
