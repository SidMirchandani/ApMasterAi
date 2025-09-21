import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "GET":
      try {
        const emails = await storage.getWaitlistEmails();

        const stats = {
          total: emails.length,
          latest: emails.length > 0 ? emails[0].email : null, // assuming descending order in storage
          all: emails,
        };

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
