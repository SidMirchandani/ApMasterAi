import type { FirstTouchPayload } from "../../../lib/attribution";

const STORAGE_KEY = "apmaster_first_touch_attribution_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingAttribution = {
  capturedAt: string;
  payload: FirstTouchPayload;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readPendingAttribution(): PendingAttribution | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAttribution;
    if (
      !parsed ||
      typeof parsed.capturedAt !== "string" ||
      !parsed.payload ||
      typeof parsed.payload !== "object"
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const age = Date.now() - new Date(parsed.capturedAt).getTime();
    if (Number.isNaN(age) || age > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/** First-touch: only write when nothing valid is stored yet. */
export function tryMergeAttributionFromPayload(
  payload: FirstTouchPayload | null
): void {
  if (!isBrowser() || !payload || Object.keys(payload).length === 0) return;
  const existing = readPendingAttribution();
  if (existing) return;

  const pending: PendingAttribution = {
    capturedAt: new Date().toISOString(),
    payload,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    /* quota / private mode */
  }
}

export function takePendingAttributionForRequest(): FirstTouchPayload | null {
  const pending = readPendingAttribution();
  return pending?.payload ?? null;
}

export function clearPendingAttribution(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
