
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/firebase-admin";
import { apSubjects } from "@/client/src/lib/ap-subjects";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get all user subjects
    const subjectsSnapshot = await db
      .collection("subjects")
      .where("userId", "==", userId)
      .get();

    const updatePromises = subjectsSnapshot.docs.map(async (doc) => {
      const subjectData = doc.data();
      const apSubject = apSubjects.find(s => s.id === subjectData.subjectId);
      
      if (apSubject) {
        // Update with latest metadata from ap-subjects.ts
        await doc.ref.update({
          units: apSubject.units,
          difficulty: apSubject.difficulty,
          examDate: apSubject.examDate,
          description: apSubject.description
        });
      }
    });

    await Promise.all(updatePromises);

    return res.status(200).json({ 
      success: true, 
      message: "Subject metadata synced successfully",
      updated: updatePromises.length
    });
  } catch (error) {
    console.error("Error syncing subject metadata:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
