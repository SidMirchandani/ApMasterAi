import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWaitlistEmailSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Waitlist signup endpoint
  app.post("/api/waitlist", async (req, res) => {
    try {
      const validatedData = insertWaitlistEmailSchema.parse(req.body);
      const waitlistEmail = await storage.addToWaitlist(validatedData);
      res.json({ 
        success: true, 
        message: "Successfully added to waitlist!",
        data: waitlistEmail 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid email format" 
        });
      }
      if (error instanceof Error && error.message === "Email already registered for waitlist") {
        return res.status(409).json({ 
          success: false, 
          message: "This email is already registered for our waitlist" 
        });
      }
      res.status(500).json({ 
        success: false, 
        message: "Failed to add to waitlist" 
      });
    }
  });

  // Get waitlist stats (optional - for admin purposes)
  app.get("/api/waitlist/stats", async (req, res) => {
    try {
      const emails = await storage.getWaitlistEmails();
      res.json({
        success: true,
        count: emails.length,
        latestSignup: emails.length > 0 ? emails[emails.length - 1].signedUpAt : null
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to get waitlist stats" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
