import type { NextApiRequest } from "next";

/**
 * Best-effort client IP for GeoIP (honor reverse proxies).
 */
export function getClientIp(req: NextApiRequest): string | null {
  const raw = req.headers["x-forwarded-for"];
  if (typeof raw === "string") {
    const first = raw.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(raw) && raw[0]) {
    return String(raw[0]).split(",")[0]?.trim() || null;
  }
  const socketIp = req.socket?.remoteAddress;
  if (socketIp && socketIp !== "::1") return socketIp;
  return null;
}
