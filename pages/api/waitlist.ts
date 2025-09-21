import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../server/storage";
import { z } from "zod";

// Schema validation for incoming email
const emailSchema = z.string().email();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "POST":
      try {
        const { email } = req.body;

        // Validate input using zod
        const parsedEmail = emailSchema.parse(email.toLowerCase().trim());

        try {
          const added = await storage.addToWaitlist({ email: parsedEmail });
          return res.status(201).json({
            success: true,
            message: "Successfully added to waitlist",
            data: added,
          });
        } catch (error: any) {
          if (error.message.includes("already registered")) {
            return res.status(409).json({
              success: false,
              message: "Email already exists in waitlist",
            });
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid email format",
            errors: error.errors,
          });
        }
        console.error("Waitlist API Error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }

    default:
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed`,
      });
  }
}
