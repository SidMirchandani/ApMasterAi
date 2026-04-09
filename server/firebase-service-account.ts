import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resolves Firebase Admin service account JSON from env (in order):
 * - FIREBASE_SERVICE_ACCOUNT_KEY — full JSON string
 * - FIREBASE_SERVICE_ACCOUNT_PATH — path to the downloaded .json file
 * - GOOGLE_APPLICATION_CREDENTIALS — standard GCP path to the same JSON file
 */
export function loadServiceAccountJson(): Record<string, unknown> | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (inline) {
    return JSON.parse(inline) as Record<string, unknown>;
  }

  const pathFromEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!pathFromEnv) {
    return null;
  }

  const absolute = resolve(pathFromEnv);
  if (!existsSync(absolute)) {
    throw new Error(
      `Firebase service account file not found: ${absolute}`,
    );
  }
  const raw = readFileSync(absolute, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

export function hasServiceAccountFileOrKey(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  );
}
