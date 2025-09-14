
import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";
import { insertUserSubjectSchema } from "@shared/schema";
import { z } from "zod";
import { databaseManager } from "../../../server/db";

async function getOrCreateUser(firebaseUid: string): Promise<number> {
  try {
    // Ensure database is healthy
    const isHealthy = await databaseManager.healthCheck();
    if (!isHealthy) {
      console.log('Database unhealthy, forcing reconnection...');
      await databaseManager.forceReconnect();
    }
    
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
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    const firebaseUid = req.headers['x-user-id'] as string;
    console.log(`${method} /api/user/subjects - Firebase UID:`, firebaseUid);
    
    if (!firebaseUid) {
      console.log("No Firebase UID provided in headers");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const userId = await getOrCreateUser(firebaseUid);

    switch (method) {
      case 'GET':
        try {
          const subjects = await storage.getUserSubjects(userId);
          console.log('Retrieved subjects:', subjects.length);
          return res.json({ 
            success: true, 
            data: subjects 
          });
        } catch (error) {
          console.error('Error getting subjects:', error);
          return res.status(500).json({
            success: false,
            message: "Failed to load subjects from database"
          });
        }

      case 'POST':
        console.log("Request body:", req.body);

        try {
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

          return res.json({ 
            success: true, 
            message: "Subject added to dashboard!",
            data: subject 
          });
        } catch (error) {
          console.error("Error in POST:", error);
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              success: false, 
              message: "Invalid subject data",
              errors: error.errors
            });
          }
          return res.status(500).json({ 
            success: false, 
            message: "Failed to add subject to database" 
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error(`Unhandled error in ${method} /api/user/subjects:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}
