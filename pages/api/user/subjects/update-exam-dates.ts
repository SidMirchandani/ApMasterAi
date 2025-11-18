
import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../server/storage";
import { getSubjectByCode } from "../../../../client/src/subjects";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
  }

  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      const { verifyFirebaseToken } = await import(
        "../../../../server/firebase-admin"
      );
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[update-exam-dates API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid);

    // Get all user subjects
    const userSubjects = await storage.getUserSubjects(userId);

    const updates = [];
    for (const userSubject of userSubjects) {
      const subject = getSubjectByCode(userSubject.subjectId);
      if (subject && subject.metadata.examDate !== userSubject.examDate) {
        await storage.updateUserSubject(userSubject.id, {
          examDate: subject.metadata.examDate
        });
        updates.push({
          subject: userSubject.name,
          oldDate: userSubject.examDate,
          newDate: subject.metadata.examDate
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Updated ${updates.length} subjects`,
      updates
    });

  } catch (error) {
    console.error("[update-exam-dates API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
