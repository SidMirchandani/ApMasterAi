
import { NextApiRequest, NextApiResponse } from 'next';
import { replitDb } from '../../../server/replit-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const stats = await replitDb.getWaitlistStats();
        return res.status(200).json(stats);
      } catch (error) {
        console.error('Waitlist Stats API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
