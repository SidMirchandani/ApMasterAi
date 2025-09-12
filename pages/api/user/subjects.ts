import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../../server/storage';
import { insertUserSubjectSchema } from '../../../shared/schema';
import { z } from 'zod';
import { DatabaseRetryHandler, ensureDatabaseHealth } from '../../../server/db-retry-handler';
import { verifyFirebaseToken } from '../../../server/firebase-admin';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        const subjects = await storage.getUserSubjects(userId);
        return res.json({ 
          success: true, 
          data: subjects 
        });

      case 'POST':
        console.log("Request body:", req.body);

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

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error in ${method} /api/user/subjects:`, error);
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid subject data" 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: method === 'GET' ? "Failed to get user subjects" : "Failed to add subject"
    });
  }
}