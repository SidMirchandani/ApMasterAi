import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../server/firebase-admin";

const urlCache = new Map<string, { url: string; expires: number }>();

function isSafeStoragePath(path: string): boolean {
  // Simple SSRF guard: only allow object-like paths, no traversal or scheme.
  if (!path || typeof path !== "string") return false;
  if (path.startsWith("http://") || path.startsWith("https://")) return false;
  if (path.includes("..")) return false;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { path } = req.query;

  if (!path || typeof path !== "string" || !isSafeStoragePath(path)) {
    return res.status(400).json({ error: "Invalid path parameter" });
  }

  try {
    const cached = urlCache.get(path);
    if (cached && cached.expires > Date.now()) {
      return res.redirect(302, cached.url);
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }

    const bucket = firebaseAdmin.storage.bucket("gen-lang-client-0260042933.firebasestorage.app");
    const file = bucket.file(path);

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    urlCache.set(path, {
      url: signedUrl,
      expires: Date.now() + 6 * 24 * 60 * 60 * 1000,
    });

    res.setHeader("Cache-Control", "public, max-age=604800");
    return res.redirect(302, signedUrl);
  } catch (error: any) {
    console.error("Image proxy error:", error?.message || error);
    return res.status(502).json({ error: "Failed to proxy image" });
  }
}
