import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";
import { requireAdmin } from "../../../server/next-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "GET":
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        const stats = await storage.getWaitlistAdminSummary();

        return res.status(200).json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("Waitlist Stats API Error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }

    default:
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed`,
      });
  }
}
