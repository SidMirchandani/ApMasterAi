
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../../../server/firebase-admin";
import { db } from "../../../../../lib/firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[mastery API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const { subjectId } = req.query;

    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    switch (req.method) {
      case "PUT": {
        const { masteryLevel } = req.body;

        if (
          typeof masteryLevel !== "number" ||
          masteryLevel < 3 ||
          masteryLevel > 5
        ) {
          return res.status(400).json({
            success: false,
            message: "Mastery level must be a number between 3 and 5",
          });
        }

        try {
          if (!db) {
            return res.status(500).json({
              success: false,
              message: "Firebase not initialized",
            });
          }

          const subjectsRef = collection(db, "userSubjects");
          const q = query(
            subjectsRef,
            where("userId", "==", firebaseUid),
            where("subjectId", "==", subjectId)
          );
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            return res.status(404).json({
              success: false,
              message: "Subject not found",
            });
          }

          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, { masteryLevel });

          const updatedData = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data(),
            masteryLevel,
          };

          return res.status(200).json({
            success: true,
            message: "Mastery level updated successfully",
            data: updatedData,
          });
        } catch (error) {
          console.error("[mastery API][PUT] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to update mastery level",
          });
        }
      }

      default:
        res.setHeader("Allow", ["PUT"]);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error("[mastery API] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
