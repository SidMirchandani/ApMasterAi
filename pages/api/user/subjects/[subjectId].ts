
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../../server/firebase-admin";
import { db } from "../../../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

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
      console.error("[subjectId API] Token verification failed:", error);
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
      case "DELETE": {
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

          // Delete the document
          await deleteDoc(querySnapshot.docs[0].ref);

          return res.status(200).json({
            success: true,
            message: "Subject removed successfully",
          });
        } catch (error) {
          console.error("[subjectId API][DELETE] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to remove subject",
          });
        }
      }

      default:
        res.setHeader("Allow", ["DELETE"]);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error("[subjectId API] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
