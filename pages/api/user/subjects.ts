
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { db } from "../../../lib/firebase";
import { collection, doc, getDocs, addDoc, query, where, deleteDoc } from "firebase/firestore";

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
      console.error("[subjects API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;

    switch (req.method) {
      case "GET": {
        try {
          if (!db) {
            return res.status(500).json({
              success: false,
              message: "Firebase not initialized",
            });
          }

          const subjectsRef = collection(db, "userSubjects");
          const q = query(subjectsRef, where("userId", "==", firebaseUid));
          const querySnapshot = await getDocs(q);
          
          const subjects = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          res.setHeader(
            "Cache-Control",
            "public, s-maxage=60, stale-while-revalidate=300",
          );
          return res.json({ success: true, data: subjects });
        } catch (error) {
          console.error("[subjects API][GET] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to load subjects",
          });
        }
      }

      case "POST": {
        try {
          if (!db) {
            return res.status(500).json({
              success: false,
              message: "Firebase not initialized",
            });
          }

          // Check if subject already exists
          const subjectsRef = collection(db, "userSubjects");
          const q = query(
            subjectsRef, 
            where("userId", "==", firebaseUid),
            where("subjectId", "==", req.body.subjectId)
          );
          const existingSnapshot = await getDocs(q);

          if (!existingSnapshot.empty) {
            return res.status(409).json({
              success: false,
              message: "Subject already added to dashboard",
            });
          }

          const subjectData = {
            ...req.body,
            userId: firebaseUid,
            dateAdded: new Date().toISOString(),
          };

          const docRef = await addDoc(subjectsRef, subjectData);
          const subject = { id: docRef.id, ...subjectData };

          return res.json({
            success: true,
            message: "Subject added to dashboard!",
            data: subject,
          });
        } catch (error) {
          console.error("[subjects API][POST] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to add subject",
          });
        }
      }

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error(`[subjects API][${req.method}] Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
