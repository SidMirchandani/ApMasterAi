
import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../../../../server/storage';
import { DatabaseRetryHandler, ensureDatabaseHealth } from '../../../../../server/db-retry-handler';

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
  const { subjectId } = req.query;

  try {
    const firebaseUid = req.headers['x-user-id'] as string;
    
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    switch (method) {
      case 'PATCH':
        const { masteryLevel } = req.body;
        
        if (!masteryLevel || masteryLevel < 3 || masteryLevel > 5) {
          return res.status(400).json({ 
            success: false, 
            message: "Mastery level must be 3, 4, or 5" 
          });
        }

        const userId = await getOrCreateUser(firebaseUid);
        const updatedSubject = await storage.updateSubjectMasteryLevel(userId, subjectId as string, masteryLevel);
        
        if (!updatedSubject) {
          return res.status(404).json({ 
            success: false, 
            message: "Subject not found" 
          });
        }

        return res.json({ 
          success: true, 
          message: "Mastery level updated",
          data: updatedSubject 
        });

      default:
        res.setHeader('Allow', ['PATCH']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Failed to update mastery level" 
    });
  }
}
