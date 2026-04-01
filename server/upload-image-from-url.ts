import { getFirebaseAdmin } from "./firebase-admin";

const FIREBASE_STORAGE_PREFIXES = [
  "https://storage.googleapis.com/gen-lang-client-0260042933.firebasestorage.app/",
  "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0260042933.firebasestorage.app/o/",
  "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0260042933.appspot.com/o/",
];

const BUCKET_NAME = "gen-lang-client-0260042933.firebasestorage.app";

const FETCH_TIMEOUT_MS = 15000;

export function isFirebaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return FIREBASE_STORAGE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(png|jpe?g|gif|webp|bmp)(\?|$)/i);
    return match ? match[1].toLowerCase() : "png";
  } catch {
    return "png";
  }
}

function getContentType(ext: string, contentTypeHeader?: string | null): string {
  if (contentTypeHeader) {
    const main = contentTypeHeader.split(";")[0].trim().toLowerCase();
    if (main.startsWith("image/")) return main;
  }
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
  };
  return map[ext] || "image/png";
}

function safeFilename(uniqueSuffix: string, ext: string): string {
  const safe = uniqueSuffix.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return safe ? `image_${safe}.${ext}` : `image.${ext}`;
}

/**
 * Download image from URL and upload to Firebase Storage.
 * Returns the public Firebase Storage URL.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  subjectCode: string,
  questionId: number,
  uniqueSuffix: string = "0"
): Promise<string> {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error("Firebase Admin not initialized");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const res = await fetch(imageUrl, {
    signal: controller.signal,
    // Constrain redirects to limit SSRF surface; callers should only pass trusted hosts.
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; APMaster/1.0)" },
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentTypeHeader = res.headers.get("content-type");
  const ext = getExtensionFromUrl(imageUrl);
  const contentType = getContentType(ext, contentTypeHeader);
  const filename = safeFilename(uniqueSuffix, ext);
  const storagePath = `questions/${subjectCode}/${questionId}/${filename}`;

  const bucket = firebaseAdmin.storage.bucket(BUCKET_NAME);
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType,
    },
  });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

type Block = { type: "text"; value: string } | { type: "image"; url: string };

export async function uploadExternalImagesInQuestion(data: {
  subject_code: string;
  question_id: number;
  prompt_blocks: Block[];
  choices: Record<string, Block[]>;
}): Promise<{ prompt_blocks: Block[]; choices: Record<string, Block[]> }> {
  const { subject_code, question_id, prompt_blocks, choices } = data;

  const processBlocks = async (blocks: Block[], keyPrefix: string): Promise<Block[]> => {
    const out: Block[] = [];
    let imageIndex = 0;
    for (const block of blocks) {
      if (block.type === "image" && block.url) {
        if (isFirebaseStorageUrl(block.url)) {
          out.push(block);
        } else {
          try {
            const url = await uploadImageFromUrl(
              block.url,
              subject_code,
              question_id,
              `${keyPrefix}_${imageIndex}`
            );
            out.push({ type: "image", url });
          } catch (err) {
            console.warn("Scrape: failed to upload image", block.url, err);
            out.push(block);
          }
          imageIndex++;
        }
      } else {
        out.push(block);
      }
    }
    return out;
  };

  const newPromptBlocks = await processBlocks(prompt_blocks || [], "prompt");
  const newChoices: Record<string, Block[]> = {};
  if (choices && typeof choices === "object") {
    for (const letter of ["A", "B", "C", "D", "E"]) {
      const blocks = choices[letter];
      if (blocks && Array.isArray(blocks)) {
        newChoices[letter] = await processBlocks(blocks, `choice_${letter}`);
      } else {
        newChoices[letter] = blocks ?? [];
      }
    }
  }

  return { prompt_blocks: newPromptBlocks, choices: newChoices };
}
