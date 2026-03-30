import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

const FIREBASE_STORAGE_PREFIXES = [
  "https://storage.googleapis.com/gen-lang-client-0260042933.firebasestorage.app/",
  "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0260042933.firebasestorage.app/o/",
  "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0260042933.appspot.com/o/",
];
const BUCKET_NAME = "gen-lang-client-0260042933.firebasestorage.app";

function extractFirebasePath(url: string): string | null {
  for (const prefix of FIREBASE_STORAGE_PREFIXES) {
    if (url.startsWith(prefix)) {
      let path = url.slice(prefix.length);
      path = path.split("?")[0];
      path = decodeURIComponent(path);
      return path;
    }
  }
  return null;
}

function extractStoragePaths(blocks: any[]): string[] {
  if (!blocks || !Array.isArray(blocks)) return [];
  const paths: string[] = [];
  for (const block of blocks) {
    if (block.type === "image" && block.url) {
      const p = extractFirebasePath(block.url);
      if (p) paths.push(p);
    }
  }
  return paths;
}

function extractLegacyImagePaths(imageUrls: any): string[] {
  if (!imageUrls || typeof imageUrls !== "object") return [];
  const paths: string[] = [];
  const keys = ["question", "A", "B", "C", "D", "E"];
  for (const key of keys) {
    const urls = imageUrls[key];
    if (Array.isArray(urls)) {
      for (const url of urls) {
        if (typeof url === "string") {
          const p = extractFirebasePath(url);
          if (p) paths.push(p);
        }
      }
    }
  }
  return paths;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  let decoded: { email?: string | null; uid?: string };
  try {
    decoded = await verifyFirebaseToken(authHeader.slice(7));
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const db = getDb();
  if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { subjectCode } = req.body || {};

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const { firestore, storage } = firebaseAdmin;
  const bucket = storage.bucket(BUCKET_NAME);

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
  req.on("close", () => { aborted = true; });

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
    sendEvent({ type: "progress", message: "Scanning questions for Firebase Storage images...", current: 0, total: 0, made_public: 0, failed: 0, skipped: 0 });

    let query = firestore.collection("questions") as FirebaseFirestore.Query;
    if (subjectCode) {
      query = query.where("subject_code", "==", subjectCode);
    }

    const snapshot = await query.get();
    const allPaths: { path: string; questionId: string }[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docPaths: string[] = [];

      docPaths.push(...extractStoragePaths(data.prompt_blocks));

      if (data.choices && typeof data.choices === "object" && !Array.isArray(data.choices)) {
        for (const key of ["A", "B", "C", "D", "E"]) {
          docPaths.push(...extractStoragePaths(data.choices[key]));
        }
      }

      docPaths.push(...extractLegacyImagePaths(data.image_urls));

      for (const p of docPaths) {
        allPaths.push({ path: p, questionId: doc.id });
      }
    }

    const uniquePaths = [...new Set(allPaths.map(p => p.path))];
    const total = uniquePaths.length;

    sendEvent({ type: "progress", message: `Found ${total} Firebase Storage images across ${snapshot.size} questions`, current: 0, total, made_public: 0, failed: 0, skipped: 0 });

    if (total === 0) {
      sendEvent({ type: "complete", message: subjectCode ? `No Firebase Storage images found for ${subjectCode}` : "No Firebase Storage images found", total: 0, made_public: 0, failed: 0, skipped: 0 });
      return res.end();
    }

    let madePublic = 0;
    let failed = 0;
    let skipped = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < uniquePaths.length; i += BATCH_SIZE) {
      if (aborted) break;

      const batch = uniquePaths.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (filePath) => {
          const file = bucket.file(filePath);
          const alreadyPublic = await file.isPublic();
          if (alreadyPublic) return { skipped: true };
          await file.makePublic();
          return { skipped: false };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.skipped) skipped++;
          else madePublic++;
        } else {
          failed++;
          console.error("Failed to make public:", result.reason?.message);
        }
      }

      sendEvent({
        type: "progress",
        message: `Making images public... ${madePublic + failed + skipped}/${total}`,
        current: madePublic + failed + skipped,
        total,
        made_public: madePublic,
        failed,
        skipped,
      });
    }

    sendEvent({
      type: "complete",
      message: `Done! Made ${madePublic} images public (${skipped} already public, ${failed} failed) across ${snapshot.size} questions`,
      total,
      made_public: madePublic,
      failed,
      skipped,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    sendEvent({ type: "error", message: error.message || "Migration failed" });
  }

  res.end();
}
