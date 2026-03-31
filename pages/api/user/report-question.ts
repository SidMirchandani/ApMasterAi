import type { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../server/api-user-auth";
import { getDb } from "../../../server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded: { uid: string };
    try {
      const { verifyFirebaseToken } = await import("../../../server/firebase-admin");
      decoded = await verifyFirebaseToken(token);
    } catch {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }
    if (!(await assertNotBanned(res, decoded.uid))) return;

    const { questionId, subjectId, reason, details } = req.body;

    if (!questionId || typeof questionId !== "string") {
      res.status(400).json({ success: false, message: "questionId is required" });
      return;
    }
    if (!subjectId || typeof subjectId !== "string") {
      res.status(400).json({ success: false, message: "subjectId is required" });
      return;
    }
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      res.status(400).json({ success: false, message: "reason is required" });
      return;
    }

    const db = getDb();
    const docRef = db.collection("questions").doc(questionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    const data = docSnap.data() || {};
    let tags: string[] = Array.isArray(data.tags) ? [...data.tags] : [];

    if (!tags.includes("error_reported")) {
      tags.push("error_reported");
    }

    tags = tags.filter(t => typeof t === "string" && !t.startsWith("error_reason:"));
    tags.push(`error_reason:${reason.trim()}`);

    if (details && typeof details === "string" && details.trim() !== "") {
      tags = tags.filter(t => typeof t === "string" && !t.startsWith("error_details:"));
      tags.push(`error_details:${details.trim()}`);
    }

    await docRef.update({ tags });

    res.status(200).json({ success: true, message: "Report submitted successfully" });
  } catch (error) {
    console.error("[report-question API] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
