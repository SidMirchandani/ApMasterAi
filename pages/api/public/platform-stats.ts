import type { NextApiRequest, NextApiResponse } from "next";
import { getPlatformPublicStats } from "../../../server/platform-public-stats";

/**
 * Public, read-only platform totals (same definitions as admin insights KPIs).
 * CDN + server in-memory cache keep responses fast; numbers refresh every few minutes.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const data = await getPlatformPublicStats();
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[public/platform-stats]", err);
    return res.status(500).json({ success: false, message });
  }
}
