
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '../../../../server/firebase-admin';

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
    const decodedToken = await adminDb.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Find user's document
    const usersSnapshot = await adminDb.firestore()
      .collection('users')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userDocId = usersSnapshot.docs[0].id;

    // Find and update AP Chemistry subject
    const subjectsSnapshot = await adminDb.firestore()
      .collection('users')
      .doc(userDocId)
      .collection('subjects')
      .where('subjectId', '==', 'chemistry')
      .limit(1)
      .get();

    if (subjectsSnapshot.empty) {
      return res.status(404).json({ message: 'AP Chemistry not found in dashboard' });
    }

    const chemSubjectDocId = subjectsSnapshot.docs[0].id;

    // Update to 9 units
    await adminDb.firestore()
      .collection('users')
      .doc(userDocId)
      .collection('subjects')
      .doc(chemSubjectDocId)
      .update({
        units: 9
      });

    return res.status(200).json({ 
      success: true, 
      message: 'AP Chemistry updated to 9 units' 
    });

  } catch (error: any) {
    console.error('Error fixing AP Chemistry units:', error);
    return res.status(500).json({ 
      message: 'Failed to update AP Chemistry', 
      error: error.message 
    });
  }
}
