
import { NextApiRequest, NextApiResponse } from 'next';
import { replitDb } from '../../server/replit-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'POST':
      try {
        const { email } = req.body;
        
        if (!email || typeof email !== 'string') {
          return res.status(400).json({ error: 'Valid email is required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        const added = await replitDb.addToWaitlist(email.toLowerCase().trim());
        
        if (!added) {
          return res.status(409).json({ error: 'Email already exists in waitlist' });
        }

        return res.status(201).json({ message: 'Successfully added to waitlist' });
      } catch (error) {
        console.error('Waitlist API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
