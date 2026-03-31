import type { IncomingHttpHeaders } from "node:http";
import { isNonPublicIp, normalizeIpForGeo } from "./ip-utils";

export type GeoLookupFailureReason =
  | "no_ip"
  | "private_ip"
  | "non_us"
  | "geo_miss"
  | "geoip_unavailable";

function readHeader(headers: IncomingHttpHeaders | undefined, key: string): string | undefined {
  if (!headers) return undefined;
  const lower = key.toLowerCase();
  const v = (headers as Record<string, string | string[] | undefined>)[key] ?? headers[lower];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v[0]) return String(v[0]).trim();
  return undefined;
}

/**
 * Vercel injects geo from the client IP (works on serverless; no geoip-lite files).
 * @see https://vercel.com/docs/headers/request-headers
 */
function lookupUsStateFromVercelHeaders(
  headers: IncomingHttpHeaders | undefined
): { state: string | null } {
  if (!headers) return { state: null };
  const country = readHeader(headers, "x-vercel-ip-country")?.toUpperCase();
  const region = readHeader(headers, "x-vercel-ip-country-region");
  if (country !== "US" || !region) return { state: null };
  let code = region.trim().toUpperCase();
  if (code.startsWith("US-") && code.length >= 5) {
    code = code.slice(3, 5);
  }
  if (/^[A-Z]{2}$/.test(code)) return { state: code };
  return { state: null };
}

/** Lazy geoip-lite so missing DB files on Vercel do not crash module load. */
function lookupGeoipLiteSync(ip: string): { country?: string; region?: string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- runtime optional; may be absent on serverless
    const geoip = require("geoip-lite") as { lookup: (ip: string) => unknown };
    const geo = geoip.lookup(ip) as { country?: string; region?: string } | null;
    return geo && typeof geo === "object" ? geo : null;
  } catch {
    // ENOENT for missing data files on Vercel, or lookup errors
    return null;
  }
}

export type InferenceSourceHint = "vercel_geo" | "ip";

/**
 * Returns US state abbreviation (e.g. NJ, CA) or null if not US / unknown.
 */
export function lookupUsStateFromIp(ip: string | null): string | null {
  const { state } = lookupUsStateFromIpWithReason(ip, undefined);
  return state;
}

/**
 * Prefer Vercel geo headers (production), then geoip-lite (local / fallback).
 */
export function lookupUsStateFromIpWithReason(
  ip: string | null,
  headers?: IncomingHttpHeaders
): {
  state: string | null;
  reason: GeoLookupFailureReason | "success";
  inferenceSource?: InferenceSourceHint;
} {
  const vercel = lookupUsStateFromVercelHeaders(headers);
  if (vercel.state) {
    return { state: vercel.state, reason: "success", inferenceSource: "vercel_geo" };
  }

  if (!ip) {
    return { state: null, reason: "no_ip" };
  }
  const trimmed = normalizeIpForGeo(ip);
  if (!trimmed) {
    return { state: null, reason: "no_ip" };
  }
  if (isNonPublicIp(trimmed)) {
    return { state: null, reason: "private_ip" };
  }

  const geo = lookupGeoipLiteSync(trimmed);
  if (!geo) {
    return { state: null, reason: "geoip_unavailable" };
  }
  if (geo.country !== "US") {
    return { state: null, reason: "non_us" };
  }
  const region = geo.region;
  if (typeof region !== "string" || region.length < 2) {
    return { state: null, reason: "geo_miss" };
  }
  return { state: region.slice(0, 2).toUpperCase(), reason: "success", inferenceSource: "ip" };
}
