
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../../server/firebase-admin";

function isAllowed(email?: string | null) {
  // Try multiple possible env var names for Replit compatibility
  const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  console.log("Raw ADMIN_EMAILS value:", adminEmails);
  
  const allow = adminEmails.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  console.log("Allowed emails:", allow);
  
  return !!email && allow.includes(email.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await verifyFirebaseToken(token);
    console.log("Decoded user email:", decoded.email);
    console.log("ADMIN_EMAILS env:", process.env.ADMIN_EMAILS);
    
    if (!isAllowed(decoded.email)) {
      return res.status(403).json({ 
        error: "Not an admin", 
        email: decoded.email,
        hint: "Add your email to ADMIN_EMAILS environment variable"
      });
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not initialized");
    }

    const { firestore } = firebaseAdmin;
    const { rows } = req.body;

    if (!Array.isArray(rows)) return res.status(400).json({ error: "Rows required" });

    const batch = firestore.batch();
    let count = 0;

    rows.forEach((r) => {
      if (!r.subject_code || !r.section_code) return;
      
      // Convert choiceA, choiceB, etc. to choices array
      const choices = [
        r.choiceA,
        r.choiceB,
        r.choiceC,
        r.choiceD,
        r.choiceE
      ].filter(Boolean); // Remove empty choices

      // Convert correct answer letter to index
      const correctLetters = ['A', 'B', 'C', 'D', 'E'];
      const answerIndex = correctLetters.indexOf(r.correct?.toUpperCase());

      const docId = `${r.subject_code}_${r.section_code}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

      batch.set(firestore.collection("questions").doc(docId), {
        subject_code: r.subject_code,
        section_code: r.section_code,
        prompt: r.prompt || "",
        choices: choices,
        answerIndex: answerIndex >= 0 ? answerIndex : 0,
        explanation: r.explanation || "",
        difficulty: r.difficulty || "",
        tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()) : [],
        mode: r.mode || "",
        test_slug: r.test_slug || "",
        question_id: r.question_id || "",
        image_url: r.image_url || "",
        rand: Math.random(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      count++;
    });

    await batch.commit();
    return res.status(200).json({ success: true, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Bulk insert failed" });
  }
}
