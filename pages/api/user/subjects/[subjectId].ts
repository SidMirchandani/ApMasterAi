
import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../../../server/storage';
import { DatabaseRetryHandler, ensureDatabaseHealth } from '../../../../server/db-retry-handler';

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

    const userId = await getOrCreateUser(firebaseUid);

    switch (method) {
      case 'DELETE':
        await storage.removeUserSubject(userId, subjectId as string);
        return res.json({ 
          success: true, 
          message: "Subject removed from dashboard" 
        });

      default:
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Failed to remove subject" 
    });
  }
}
