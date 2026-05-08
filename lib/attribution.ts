/**
 * First-touch marketing attribution helpers (client + server).
 * Do not use attribution for permissions, grading, or student-facing product logic.
 */

const ATTRIBUTION_VALUE_MAX_LENGTH = 80;
/** Lowercase letters, digits, underscore, hyphen, dot, colon (click ids). */
const SAFE_ATTRIBUTION_VALUE = /^[a-z0-9_.:-]+$/;

export const ATTRIBUTION_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "msclkid",
  "referral",
] as const;

export type AttributionQueryKey = (typeof ATTRIBUTION_QUERY_KEYS)[number];

export type FirstTouchPayload = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  referral?: string;
};

type UtmKey =
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "gclid"
  | "fbclid"
  | "msclkid"
  | "referral";

const PRESET_FIELDS: (keyof Pick<
  Record<UtmKey, string>,
  "utm_medium" | "utm_campaign" | "referral"
>)[] = ["utm_medium", "utm_campaign", "referral"];

/** Per-source defaults for missing medium / campaign / referral (values sanitized again when applied). */
export const UTM_SOURCE_PRESETS: Record<
  string,
  Partial<Pick<Record<UtmKey, string>, "utm_medium" | "utm_campaign" | "referral">>
> = {
  tiktok: { utm_medium: "tiktok", utm_campaign: "tiktok", referral: "tiktok" },
  instagram: {
    utm_medium: "instagram",
    utm_campaign: "instagram",
    referral: "instagram",
  },
  facebook: {
    utm_medium: "facebook",
    utm_campaign: "facebook",
    referral: "facebook",
  },
  google: { utm_medium: "google", utm_campaign: "google", referral: "google" },
  email: { utm_medium: "email", utm_campaign: "email", referral: "email" },
  partner: { utm_medium: "partner", utm_campaign: "partner", referral: "partner" },
  youtube: { utm_medium: "youtube", utm_campaign: "youtube", referral: "youtube" },
};

function firstQueryValue(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;
  return raw;
}

export function sanitizeAttributionValue(value: string): string | null {
  const s = value.trim().toLowerCase();
  if (!s) return null;
  const clipped = s.slice(0, ATTRIBUTION_VALUE_MAX_LENGTH);
  if (!SAFE_ATTRIBUTION_VALUE.test(clipped)) return null;
  return clipped;
}

/** Read allowlisted params from a Next.js-style query object. */
export function parseAttributionFromUnknownQuery(
  query: Record<string, string | string[] | undefined>
): Partial<Record<UtmKey, string>> {
  const out: Partial<Record<UtmKey, string>> = {};
  for (const key of ATTRIBUTION_QUERY_KEYS) {
    const raw = firstQueryValue(query[key]);
    if (raw === undefined) continue;
    const decoded = safeDecodeParam(raw);
    const clean = sanitizeAttributionValue(decoded);
    if (clean) out[key] = clean;
  }
  return out;
}

function safeDecodeParam(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

/**
 * Fill missing medium / campaign / referral from presets + echo utm_source.
 * Does not invent click ids or content/term.
 */
export function expandFromUtmSource(
  parsed: Partial<Record<UtmKey, string>>
): Record<UtmKey, string> {
  const base = { ...parsed } as Record<UtmKey, string>;
  const source = base.utm_source;
  if (!source) return base;

  const preset = UTM_SOURCE_PRESETS[source];
  if (preset) {
    for (const k of PRESET_FIELDS) {
      if (base[k] == null || base[k] === "") {
        const v = preset[k];
        if (v != null) {
          const clean = sanitizeAttributionValue(v);
          if (clean) base[k] = clean;
        }
      }
    }
  }

  for (const k of PRESET_FIELDS) {
    if (base[k] == null || base[k] === "") {
      base[k] = source;
    }
  }

  return base;
}

export function toFirstTouchPayload(
  expanded: Partial<Record<UtmKey, string>>
): FirstTouchPayload {
  const p: FirstTouchPayload = {};
  if (expanded.utm_source) p.source = expanded.utm_source;
  if (expanded.utm_medium) p.medium = expanded.utm_medium;
  if (expanded.utm_campaign) p.campaign = expanded.utm_campaign;
  if (expanded.utm_content) p.content = expanded.utm_content;
  if (expanded.utm_term) p.term = expanded.utm_term;
  if (expanded.gclid) p.gclid = expanded.gclid;
  if (expanded.fbclid) p.fbclid = expanded.fbclid;
  if (expanded.msclkid) p.msclkid = expanded.msclkid;
  if (expanded.referral) p.referral = expanded.referral;
  return p;
}

export function isFirstTouchPayloadEmpty(p: FirstTouchPayload): boolean {
  return Object.keys(p).length === 0;
}

/** Full pipeline from router query → stored API shape. */
export function attributionFromRouterQuery(
  query: Record<string, string | string[] | undefined>
): FirstTouchPayload | null {
  const raw = parseAttributionFromUnknownQuery(query);
  if (!raw.utm_source && Object.keys(raw).length === 0) return null;
  if (!raw.utm_source && Object.keys(raw).length > 0) {
    const expanded = expandFromUtmSource(raw);
    const payload = toFirstTouchPayload(expanded);
    return isFirstTouchPayloadEmpty(payload) ? null : payload;
  }
  const expanded = expandFromUtmSource(raw);
  const payload = toFirstTouchPayload(expanded);
  return isFirstTouchPayloadEmpty(payload) ? null : payload;
}

const CLIENT_BODY_KEYS = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "gclid",
  "fbclid",
  "msclkid",
  "referral",
] as const;

/** Re-validate client POST body and re-run expansion (single source of truth on server). */
export function normalizeFirstTouchAttributionFromRequestBody(
  body: unknown
): FirstTouchPayload | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const o = body as Record<string, unknown>;
  const utm: Partial<Record<UtmKey, string>> = {};

  const mapKey: Record<(typeof CLIENT_BODY_KEYS)[number], UtmKey> = {
    source: "utm_source",
    medium: "utm_medium",
    campaign: "utm_campaign",
    content: "utm_content",
    term: "utm_term",
    gclid: "gclid",
    fbclid: "fbclid",
    msclkid: "msclkid",
    referral: "referral",
  };

  for (const ck of CLIENT_BODY_KEYS) {
    const v = o[ck];
    if (typeof v !== "string") continue;
    const clean = sanitizeAttributionValue(v);
    if (!clean) continue;
    utm[mapKey[ck]] = clean;
  }

  if (!utm.utm_source && Object.keys(utm).length === 0) return null;
  const expanded = expandFromUtmSource(utm);
  const payload = toFirstTouchPayload(expanded);
  return isFirstTouchPayloadEmpty(payload) ? null : payload;
}
