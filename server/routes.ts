import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWaitlistEmailSchema, insertUserSubjectSchema } from "@shared/schema";
import { z } from "zod";
import { DatabaseRetryHandler, ensureDatabaseHealth } from "./db-retry-handler";

// Enhanced middleware to handle Firebase user authentication with database retry
async function getOrCreateUser(firebaseUid: string): Promise<number> {
  return DatabaseRetryHandler.withRetry(async () => {
    await ensureDatabaseHealth();
    
    // Try to find user by username (using firebase UID as username)
    let user = await storage.getUserByUsername(firebaseUid);
    
    if (!user) {
      // Create new user with Firebase UID as username
      user = await storage.createUser({
        username: firebaseUid,
        password: 'firebase_auth' // Placeholder since we use Firebase
      });
      console.log('Created new user for Firebase UID:', firebaseUid);
    }
    
    return user.id;
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // User subjects endpoints
  app.get("/api/user/subjects", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      console.log("GET /api/user/subjects - Firebase UID:", firebaseUid);
      
      if (!firebaseUid) {
        console.log("No Firebase UID provided in headers");
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      const userId = await getOrCreateUser(firebaseUid);
      const subjects = await storage.getUserSubjects(userId);
      
      res.json({ 
        success: true, 
        data: subjects 
      });
    } catch (error) {
      console.error("Error in GET /api/user/subjects:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get user subjects" 
      });
    }
  });

  app.post("/api/user/subjects", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      console.log("POST /api/user/subjects - Firebase UID:", firebaseUid);
      console.log("Request body:", req.body);
      
      if (!firebaseUid) {
        console.log("No Firebase UID provided in headers");
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      const userId = await getOrCreateUser(firebaseUid);
      
      // Check if user already has this subject
      const hasSubject = await storage.hasUserSubject(userId, req.body.subjectId);
      if (hasSubject) {
        return res.status(409).json({ 
          success: false, 
          message: "Subject already added to dashboard" 
        });
      }

      const validatedData = insertUserSubjectSchema.parse({
        ...req.body,
        userId
      });
      
      const subject = await storage.addUserSubject(validatedData);
      
      res.json({ 
        success: true, 
        message: "Subject added to dashboard!",
        data: subject 
      });
    } catch (error) {
      console.error("Error in POST /api/user/subjects:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ 
          success: false, 
          message: "Invalid subject data" 
        });
      }
      res.status(500).json({ 
        success: false, 
        message: "Failed to add subject" 
      });
    }
  });

  app.delete("/api/user/subjects/:subjectId", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      
      if (!firebaseUid) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      const userId = await getOrCreateUser(firebaseUid);
      await storage.removeUserSubject(userId, req.params.subjectId);
      
      res.json({ 
        success: true, 
        message: "Subject removed from dashboard" 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to remove subject" 
      });
    }
  });

  app.patch("/api/user/subjects/:subjectId/mastery", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      
      if (!firebaseUid) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      const { masteryLevel } = req.body;
      
      if (!masteryLevel || masteryLevel < 3 || masteryLevel > 5) {
        return res.status(400).json({ 
          success: false, 
          message: "Mastery level must be 3, 4, or 5" 
        });
      }

      const userId = await getOrCreateUser(firebaseUid);
      const updatedSubject = await storage.updateSubjectMasteryLevel(userId, req.params.subjectId, masteryLevel);
      
      if (!updatedSubject) {
        return res.status(404).json({ 
          success: false, 
          message: "Subject not found" 
        });
      }

      res.json({ 
        success: true, 
        message: "Mastery level updated",
        data: updatedSubject 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update mastery level" 
      });
    }
  });

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

  // =====================
  // BOOKMARK ROUTES
  // =====================
  app.post("/api/user/bookmarks/toggle", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const { questionId, subjectId, unitId, prompt, choices, answerIndex, explanation, sectionCode } = req.body;
      if (!questionId || !subjectId) {
        return res.status(400).json({ success: false, message: "questionId and subjectId are required" });
      }

      const result = await storage.toggleBookmark(firebaseUid, {
        questionId, subjectId, unitId: unitId || '', prompt: prompt || '',
        choices: choices || [], answerIndex: answerIndex ?? 0,
        explanation: explanation || '', sectionCode,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      res.status(500).json({ success: false, message: "Failed to toggle bookmark" });
    }
  });

  app.get("/api/user/bookmarks", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const subjectId = req.query.subjectId as string | undefined;
      const bookmarks = await storage.getBookmarks(firebaseUid, subjectId);
      res.json({ success: true, data: bookmarks });
    } catch (error) {
      console.error("Error getting bookmarks:", error);
      res.status(500).json({ success: false, message: "Failed to get bookmarks" });
    }
  });

  app.get("/api/user/bookmarks/ids", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const subjectId = req.query.subjectId as string | undefined;
      const ids = await storage.getBookmarkedQuestionIds(firebaseUid, subjectId);
      res.json({ success: true, data: ids });
    } catch (error) {
      console.error("Error getting bookmark ids:", error);
      res.status(500).json({ success: false, message: "Failed to get bookmark ids" });
    }
  });

  // =====================
  // SPACED REPETITION ROUTES
  // =====================
  app.post("/api/user/questions/track", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const { questionId, subjectId, unitId, correct, timeSpentSec, sectionCode, prompt, choices, answerIndex, explanation } = req.body;
      if (!questionId || !subjectId) {
        return res.status(400).json({ success: false, message: "questionId and subjectId are required" });
      }

      await storage.trackQuestionPerformance(firebaseUid, {
        questionId, subjectId, unitId: unitId || '',
        correct: !!correct, timeSpentSec: timeSpentSec || 0,
        sectionCode, prompt, choices, answerIndex, explanation,
      });

      res.json({ success: true, message: "Question performance tracked" });
    } catch (error) {
      console.error("Error tracking question:", error);
      res.status(500).json({ success: false, message: "Failed to track question" });
    }
  });

  app.get("/api/user/questions/due", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const subjectId = req.query.subjectId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const dueReviews = await storage.getDueReviews(firebaseUid, subjectId, limit);
      res.json({ success: true, data: dueReviews });
    } catch (error) {
      console.error("Error getting due reviews:", error);
      res.status(500).json({ success: false, message: "Failed to get due reviews" });
    }
  });

  // =====================
  // ANALYTICS ROUTE
  // =====================
  app.get("/api/user/analytics", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const subjectId = req.query.subjectId as string | undefined;
      const stats = await storage.getQuestionStats(firebaseUid, subjectId);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ success: false, message: "Failed to get analytics" });
    }
  });

  app.post("/api/questions/report", async (req, res) => {
    try {
      const firebaseUid = req.headers['x-user-id'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const { questionId, subjectId, reason, details } = req.body;
      if (!questionId || !subjectId || !reason) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const report = await storage.createQuestionReport({
        userId: user.id,
        questionId,
        subjectId,
        reason,
        details,
      });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error("Error creating question report:", error);
      res.status(500).json({ success: false, message: "Failed to create report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
