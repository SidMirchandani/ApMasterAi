
import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../../../server/storage';
import { verifyFirebaseToken } from '../../../../server/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyFirebaseToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user
    const user = await storage.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all subjects
    const subjects = await storage.getUserSubjects(user.id);
    
    // Find AP Chemistry
    const chemSubject = subjects.find(s => s.subjectId === 'chemistry');
    if (!chemSubject) {
      return res.status(404).json({ message: 'AP Chemistry not found in dashboard' });
    }

    if (chemSubject.units === 9) {
      return res.status(200).json({ 
        success: true, 
        message: 'AP Chemistry already has 9 units',
        currentUnits: chemSubject.units
      });
    }

    // Update to 9 units
    await storage.updateUserSubject(chemSubject.id!, { units: 9 });

    return res.status(200).json({ 
      success: true, 
      message: 'AP Chemistry updated from 8 to 9 units',
      previousUnits: chemSubject.units,
      newUnits: 9
    });

  } catch (error: any) {
    console.error('Error fixing AP Chemistry units:', error);
    return res.status(500).json({ 
      message: 'Failed to update AP Chemistry', 
      error: error.message 
    });
  }
}
