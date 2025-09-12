
import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../server/storage';
import { insertWaitlistEmailSchema } from '../../shared/schema';
import { z } from 'zod';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      try {
        const validatedData = insertWaitlistEmailSchema.parse(req.body);
        const waitlistEmail = await storage.addToWaitlist(validatedData);
        return res.json({ 
          success: true, 
          message: "Successfully added to waitlist!",
          data: waitlistEmail 
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid email format" 
          });
        }
        if (error instanceof Error && error.message === "Email already registered for waitlist") {
          return res.status(409).json({ 
            success: false, 
            message: "This email is already registered for our waitlist" 
          });
        }
        return res.status(500).json({ 
          success: false, 
          message: "Failed to add to waitlist" 
        });
      }

    default:
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
