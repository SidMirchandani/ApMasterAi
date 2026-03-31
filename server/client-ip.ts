import type { IncomingHttpHeaders } from "node:http";
import { isNonPublicIp, normalizeIpForGeo } from "./ip-utils";

export type IncomingWithSocket = {
  headers: IncomingHttpHeaders;
  socket?: { remoteAddress?: string };
};

function headerString(headers: IncomingHttpHeaders, name: string): string | null {
  const v = headers[name];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v[0]) return String(v[0]).trim();
  return null;
}

function splitForwardedChain(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function collectHeaderCandidates(headers: IncomingHttpHeaders): string[] {
  const out: string[] = [];
  const cf = headerString(headers, "cf-connecting-ip");
  if (cf) out.push(cf);
  const trueClient = headerString(headers, "true-client-ip");
  if (trueClient) out.push(trueClient);
  const realIp = headerString(headers, "x-real-ip");
  if (realIp) out.push(realIp);
  const xff = headerString(headers, "x-forwarded-for");
  if (xff) {
    for (const part of splitForwardedChain(xff)) {
      out.push(part);
    }
  }
  return out;
}

/**
 * Best-effort client IP for GeoIP (honor reverse proxies).
 * Returns the first public-looking IP from trusted proxy headers, then socket.
 */
export function getClientIp(req: IncomingWithSocket): string | null {
  const candidates = collectHeaderCandidates(req.headers);

  for (const c of candidates) {
    const n = normalizeIpForGeo(c);
    if (!n) continue;
    if (!isNonPublicIp(n)) return n;
  }

  const socketIp = req.socket?.remoteAddress;
  if (socketIp) {
    const n = normalizeIpForGeo(socketIp);
    if (n && !isNonPublicIp(n)) return n;
  }

  return null;
}
