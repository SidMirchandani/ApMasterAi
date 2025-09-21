import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";
import { insertUserSubjectSchema } from "@shared/schema";
import { z } from "zod";

async function getOrCreateUser(firebaseUid: string): Promise<number> {
  let user = await storage.getUserByUsername(firebaseUid);

  if (!user) {
    user = await storage.createUser({
      username: firebaseUid,
      password: "firebase_auth", // placeholder since Firebase handles auth
    });
    console.log("Created new user for Firebase UID:", firebaseUid);
  }

  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;
  const firebaseUid = req.headers["x-user-id"] as string;

  if (!firebaseUid) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const userId = await getOrCreateUser(firebaseUid);

    switch (method) {
      case "GET": {
        const subjects = await storage.getUserSubjects(userId);
        res.setHeader(
          "Cache-Control",
          "public, s-maxage=60, stale-while-revalidate=300",
        );
        return res.json({ success: true, data: subjects });
      }

      case "POST": {
        try {
          const hasSubject = await storage.hasUserSubject(
            userId,
            req.body.subjectId,
          );
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
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              success: false,
              message: "Invalid subject data",
              errors: error.errors,
            });
          }
          throw error;
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
    console.error(`Unhandled error in ${method} /api/user/subjects:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
