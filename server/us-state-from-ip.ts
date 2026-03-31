import geoip from "geoip-lite";
import { isNonPublicIp, normalizeIpForGeo } from "./ip-utils";

export type GeoLookupFailureReason = "no_ip" | "private_ip" | "non_us" | "geo_miss";

/**
 * Returns US state abbreviation (e.g. NJ, CA) or null if not US / unknown.
 */
export function lookupUsStateFromIp(ip: string | null): string | null {
  const { state } = lookupUsStateFromIpWithReason(ip);
  return state;
}

/**
 * Same as lookupUsStateFromIp but includes a coarse failure reason for logging.
 */
export function lookupUsStateFromIpWithReason(ip: string | null): {
  state: string | null;
  reason: GeoLookupFailureReason | "success";
} {
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

  const geo = geoip.lookup(trimmed);
  if (!geo) {
    return { state: null, reason: "geo_miss" };
  }
  if (geo.country !== "US") {
    return { state: null, reason: "non_us" };
  }
  const region = geo.region;
  if (typeof region !== "string" || region.length < 2) {
    return { state: null, reason: "geo_miss" };
  }
  return { state: region.slice(0, 2).toUpperCase(), reason: "success" };
}
