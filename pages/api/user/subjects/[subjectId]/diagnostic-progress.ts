import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);
  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
  }
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      const { verifyFirebaseToken } = await import("../../../../../server/firebase-admin");
      decodedToken = await verifyFirebaseToken(token);
    } catch {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    const userId = await getOrCreateUser(decodedToken.uid);
    const { subjectId } = req.query;
    if (!subjectId || typeof subjectId !== "string") {
      res.status(400).json({ success: false, message: "Valid subject ID is required" });
      return;
    }

    if (req.method === "GET") {
      // #region agent log
      fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'diagnostic-progress.ts:GET:entry',message:'GET handler',data:{subjectId},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const progress = await storage.getDiagnosticProgress(userId, subjectId);
      // #region agent log
      fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'diagnostic-progress.ts:GET:send',message:'sending GET response',data:{hasProgress:!!progress},hypothesisId:'B',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      res.status(200).json({ success: true, data: progress });
      return;
    }

    if (req.method === "POST") {
      const { questionIndex, userAnswers, unitDifficultyState, questions } = req.body;
      if (typeof questionIndex !== "number" || !userAnswers || !unitDifficultyState) {
        res.status(400).json({ success: false, message: "Invalid progress payload" });
        return;
      }
      await storage.saveDiagnosticProgress(userId, subjectId, {
        questionIndex,
        userAnswers,
        unitDifficultyState,
        questions: questions || [],
      });
      res.status(200).json({ success: true });
      return;
    }

    if (req.method === "DELETE") {
      await storage.clearDiagnosticProgress(userId, subjectId);
      res.status(200).json({ success: true });
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    return;
  } catch (error) {
    console.error("[diagnostic-progress API] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
}
