import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { z } from "zod";
import { UserSubject } from "../../../shared/schema";

// Define the schema inline since the shared schema import is not working
const insertUserSubjectSchema = z.object({
  userId: z.string(),
  subjectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  units: z.number().min(1).max(8),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  examDate: z.string(),
  progress: z.number().min(0).max(100).default(0),
  masteryLevel: z.number().min(0).max(100).default(0),
});

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  try {
    let user = await storage.getUserByFirebaseUid(firebaseUid);

    if (!user) {
      user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`, firebaseUid);
      console.log(
        "[subjects API] Created new user for Firebase UID:",
        firebaseUid,
      );
    }

    return user.id;
  } catch (error) {
    console.error("[subjects API] Error in getOrCreateUser:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;

  // Verify Firebase token first
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required - missing token",
    });
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = await verifyFirebaseToken(token);
  } catch (error) {
    console.error("[subjects API] Token verification failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  const firebaseUid = decodedToken.uid;

  try {
    const userId = await getOrCreateUser(firebaseUid);

    switch (method) {
      case "GET": {
        try {
          const subjects = await storage.getUserSubjects(userId);
          res.setHeader(
            "Cache-Control",
            "public, s-maxage=60, stale-while-revalidate=300",
          );
          return res.json({ success: true, data: subjects });
        } catch (error) {
          console.error("[subjects API][GET] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to load subjects from database",
          });
        }
      }

      case "POST": {
        try {
          const existingSubjects = await storage.getUserSubjects(userId);
          const hasSubject = existingSubjects.some(s => s.subjectId === req.body.subjectId);
          if (hasSubject) {
            return res.status(409).json({
              success: false,
              message: "Subject already added to dashboard",
            });
          }

          const validatedData = insertUserSubjectSchema.parse({
            ...req.body,
            userId,
          });

          const subject = await storage.addUserSubject(validatedData);

          return res.json({
            success: true,
            message: "Subject added to dashboard!",
            data: subject,
          });
        } catch (error) {
          console.error("[subjects API][POST] Error:", error);
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              success: false,
              message: "Invalid subject data",
              errors: error.errors,
            });
          }
          return res.status(500).json({
            success: false,
            message: "Failed to add subject to database",
          });
        }
      }

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`,
        });
    }
  } catch (error) {
    console.error(`[subjects API][${req.method}] Unhandled error:`, error);

    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Database') || 
        errorMessage.includes('connection') || 
        errorMessage.includes('Firestore') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('access token')) {
      return res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. This is likely due to Firebase configuration in development mode.",
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        retryAfter: 5000
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}