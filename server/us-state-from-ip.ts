import geoip from "geoip-lite";

/**
 * Returns US state abbreviation (e.g. NJ, CA) or null if not US / unknown.
 */
export function lookupUsStateFromIp(ip: string | null): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (trimmed === "::1" || trimmed === "127.0.0.1") return null;

  const geo = geoip.lookup(trimmed);
  if (!geo || geo.country !== "US") return null;
  const region = geo.region;
  if (typeof region !== "string" || region.length < 2) return null;
  return region.slice(0, 2).toUpperCase();
}
