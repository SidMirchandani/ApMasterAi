import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../server/storage";
import admin from "firebase-admin"; // Assuming admin is used elsewhere for Firebase

// Helper function to get Firestore instance, assuming it's initialized
function getDb() {
  if (admin.apps.length === 0) {
    // Initialize Firebase Admin if not already initialized
    // Replace with your service account key path or other initialization method
    // admin.initializeApp({
    //   credential: admin.credential.cert(require("../../../../path/to/serviceAccountKey.json")),
    // });
    console.warn("Firebase Admin SDK not initialized. Assuming it's initialized elsewhere.");
  }
  return admin.firestore();
}


async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);

  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
    console.log(
      "[subjectId API] Created new user for Firebase UID:",
      firebaseUid,
    );
  }

  return user.id;
}

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
      const { verifyFirebaseToken } = await import(
        "../../../../server/firebase-admin"
      );
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.error("[subjectId API] Token verification failed:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const firebaseUid = decodedToken.uid;
    const userId = await getOrCreateUser(firebaseUid);

    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required",
      });
    }

    if (req.method === "PUT") {
      // Handle archive/unarchive
      try {
        const { archived } = req.body;

        console.log("[Archive] Request details:", {
          subjectId,
          archived,
          userId
        });

        if (typeof archived !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: "archived field must be a boolean"
          });
        }

        const db = getDb();
        const userSubjectsRef = db.collection('user_subjects');

        // Get the document directly by its Firestore document ID
        const docRef = userSubjectsRef.doc(subjectId as string);
        const doc = await docRef.get();

        if (!doc.exists) {
          console.log("[Archive] Document not found:", subjectId);
          return res.status(404).json({
            success: false,
            message: "Subject not found."
          });
        }

        // Verify it belongs to the user
        const data = doc.data();
        if (data?.userId !== userId) {
          console.log("[Archive] Document does not belong to user:", {
            docUserId: data?.userId,
            requestUserId: userId
          });
          return res.status(404).json({
            success: false,
            message: "Subject not found or does not belong to the user."
          });
        }

        await docRef.update({ archived });

        console.log("[Archive] Successfully updated document:", docRef.id);

        return res.status(200).json({
          success: true,
          message: archived ? "Subject archived" : "Subject restored"
        });
      } catch (error) {
        console.error("[Archive] Error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to archive subject"
        });
      }
    }

    switch (req.method) {
      case "DELETE": {
        console.log("🗑️ [API DELETE] Request received");
        console.log("Subject ID from URL:", subjectId);
        console.log("User ID:", userId);
        
        try {
          const existingSubject = await storage.getUserSubject(subjectId);
          console.log("Found subject:", existingSubject ? "YES" : "NO");
          
          if (!existingSubject) {
            console.log("❌ Subject not found in database");
            return res.status(404).json({
              success: false,
              message: "Subject not found"
            });
          }
          
          console.log("Subject belongs to user:", existingSubject.userId, "Expected:", userId);
          
          if (existingSubject.userId !== userId) {
            console.log("❌ User mismatch");
            return res.status(403).json({
              success: false,
              message: "Unauthorized to delete this subject"
            });
          }
          
          console.log("✅ Calling storage.deleteUserSubject...");
          await storage.deleteUserSubject(subjectId);
          console.log("✅ Delete completed");
          
          return res.status(200).json({
            success: true,
            message: "Subject removed successfully",
          });
        } catch (error) {
          console.error("❌ DELETE ERROR:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to remove subject",
            error: error.message
          });
        }
      }

      case "PUT": {
        try {
          // Verify subject ownership before proceeding with updates
          const subject = await storage.getUserSubject(userId, subjectId);
          if (!subject) {
            return res.status(404).json({
              success: false,
              message: "Subject not found or does not belong to the user.",
            });
          }

          const updates = req.body;
          // Ensure that we are not overwriting essential fields with empty values if not provided
          const sanitizedUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null)
          );

          await storage.updateUserSubject(userId, subjectId, sanitizedUpdates);
          console.log(`[subjectId API][PUT] Successfully updated subject ${subjectId} for user ${userId}`);
          return res.status(200).json({ success: true, message: "Subject updated successfully" });
        } catch (error) {
          console.error(`[subjectId API][PUT] Error updating subject ${subjectId} for user ${userId}:`, error);
          return res.status(500).json({
            success: false,
            message: "Failed to update subject",
            error: error.message,
          });
        }
      }

      default:
        res.setHeader("Allow", ["DELETE", "PUT", "PATCH"]);
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