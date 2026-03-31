import { NextApiRequest, NextApiResponse } from "next";
import { assertNotBanned } from "../../../../server/api-user-auth";
import { verifyFirebaseToken } from "../../../../server/firebase-admin";
import { storage } from "../../../../server/storage";
import { getDb } from "../../../../server/db";

/** Derive prompt string from question doc (prompt or prompt_blocks). */
function getPromptFromQuestion(doc: any): string | undefined {
  if (doc.prompt && typeof doc.prompt === "string") return doc.prompt;
  if (Array.isArray(doc.prompt_blocks)) {
    const text = doc.prompt_blocks
      .filter((b: any) => b && b.type === "text" && b.value != null)
      .map((b: any) => String(b.value))
      .join(" ");
    return text.trim() || undefined;
  }
  return undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyFirebaseToken(token);
    if (!(await assertNotBanned(res, decodedToken.uid))) return;
    const userId = decodedToken.uid;

    const subjectId = req.query.subjectId as string | undefined;
    const unitId = req.query.unitId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    let dueReviews = await storage.getDueReviews(userId, subjectId, limit, unitId);

    // Enrich with question content from Firestore so review page has prompt/choices/explanation
    try {
      const db = getDb();
      const questionsRef = db.collection("questions");
      const enriched = await Promise.all(
        dueReviews.map(async (item: any) => {
          if (item.prompt != null && item.choices != null) return item;
          try {
            const snap = await questionsRef.doc(item.questionId).get();
            if (!snap.exists) return item;
            const doc = snap.data() as any;
            return {
              ...item,
              prompt: item.prompt ?? getPromptFromQuestion(doc),
              choices: item.choices ?? doc.choices,
              answerIndex: item.answerIndex ?? doc.answerIndex,
              explanation: item.explanation ?? doc.explanation,
            };
          } catch {
            return item;
          }
        })
      );
      dueReviews = enriched;
    } catch (e) {
      console.warn("Due reviews enrichment failed, returning without question content:", e);
    }

    return res.status(200).json({ success: true, data: dueReviews });
  } catch (error) {
    console.error("Error getting due reviews:", error);
    return res.status(500).json({ success: false, message: "Failed to get due reviews" });
  }
}
