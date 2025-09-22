import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Firebase not initialized",
      });
    }

    // Check if email already exists
    const waitlistRef = collection(db, "waitlist");
    const q = query(waitlistRef, where("email", "==", email));
    const existingSnapshot = await getDocs(q);

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Email already registered for waitlist",
      });
    }

    // Add to waitlist
    const waitlistData = {
      email,
      signedUpAt: new Date().toISOString(),
    };

    await addDoc(waitlistRef, waitlistData);

    return res.status(201).json({
      success: true,
      message: "Successfully added to waitlist!",
    });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add to waitlist",
    });
  }
}