import net from "node:net";

/**
 * Normalizes an IP string for GeoIP lookup (IPv4-mapped IPv6, zone id).
 */
export function normalizeIpForGeo(ip: string): string {
  let t = ip.trim();
  if (t.startsWith("::ffff:")) {
    t = t.slice(7);
  }
  if (t.includes("%")) {
    t = t.split("%")[0] ?? t;
  }
  return t;
}

/**
 * True for loopback, link-local, private (RFC1918), CGNAT, and IPv6 ULA.
 */
export function isNonPublicIp(ip: string): boolean {
  const raw = ip.trim();
  if (!raw) return true;
  const t = normalizeIpForGeo(raw);

  if (t === "::1" || t === "127.0.0.1") return true;

  if (net.isIPv4(t)) {
    const parts = t.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true;
    return false;
  }

  if (net.isIPv6(t)) {
    const lower = t.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }

  return true;
}
