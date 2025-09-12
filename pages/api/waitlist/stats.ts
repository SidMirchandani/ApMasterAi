
import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../../server/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const emails = await storage.getWaitlistEmails();
        return res.json({
          success: true,
          count: emails.length,
          latestSignup: emails.length > 0 ? emails[emails.length - 1].signedUpAt : null
        });
      } catch (error) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to get waitlist stats" 
        });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
