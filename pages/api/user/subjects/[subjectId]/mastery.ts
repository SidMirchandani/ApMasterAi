
import { NextApiRequest, NextApiResponse } from 'next';
import { replitDb } from '../../../../../server/replit-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;
    
    try {
      const { verifyFirebaseToken } = await import('../../../../../server/firebase-admin');
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decodedToken.uid;
    const { subjectId } = req.query;

    if (!subjectId || typeof subjectId !== 'string') {
      return res.status(400).json({ error: 'Valid subject ID is required' });
    }

    switch (req.method) {
      case 'PUT':
        const { masteryLevel } = req.body;
        
        if (typeof masteryLevel !== 'number' || masteryLevel < 0 || masteryLevel > 100) {
          return res.status(400).json({ error: 'Mastery level must be a number between 0 and 100' });
        }

        const updatedSubject = await replitDb.updateSubjectMastery(userId, subjectId, masteryLevel);
        
        if (!updatedSubject) {
          return res.status(404).json({ error: 'Subject not found' });
        }

        return res.status(200).json({ subject: updatedSubject });

      default:
        res.setHeader('Allow', ['PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
