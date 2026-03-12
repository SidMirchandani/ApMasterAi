import { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { storage } from "../../../server/storage";

async function getOrCreateUser(firebaseUid: string): Promise<string> {
  let user = await storage.getUserByFirebaseUid(firebaseUid);
  if (!user) {
    user = await storage.createUser(firebaseUid, `${firebaseUid}@firebase.user`);
  }
  return user.id;
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
    const userId = await getOrCreateUser(decodedToken.uid);

    const subjectId = req.query.subjectId as string | undefined;

    // Fetch full-length, diagnostic, and unit quiz results in parallel
    const [fullLengthTests, diagnosticTests, unitQuizResults] = await Promise.all([
      storage.getAllFullLengthTests(userId, subjectId),
      storage.getAllDiagnosticTests(userId, subjectId),
      storage.getAllUnitQuizResults(userId, subjectId),
    ]);

    console.log("[test-history API] fetched tests", {
      userId,
      subjectId,
      fullLengthCount: fullLengthTests.length,
      diagnosticCount: diagnosticTests.length,
      unitQuizCount: unitQuizResults.length,
    });

    const combined = [
      ...fullLengthTests.map((t) => ({ ...t, type: t.type || "full-length" })),
      ...diagnosticTests.map((t) => ({ ...t, type: "diagnostic" })),
      ...unitQuizResults.map((t) => ({ ...t, type: "unit" })),
    ].sort((a, b) => {
      const aMs = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
      const bMs = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
      return aMs - bMs;
    });

    const testHistory = combined.map((test, index) => ({
      testNumber: index + 1,
      id: test.id,
      date: test.date,
      score: test.score,
      percentage: test.percentage,
      totalQuestions: test.totalQuestions,
      subjectId: test.subjectId,
      type: test.type,
      sectionBreakdown: test.sectionBreakdown || {},
      ...(test.type === "unit" && {
        unitId: test.unitId,
        sectionCode: test.sectionCode,
        unitNumber: test.sectionBreakdown?.[test.sectionCode]?.unitNumber,
      }),
    }));

    return res.status(200).json({ success: true, data: testHistory });
  } catch (error) {
    console.error("Error getting test history:", error);
    return res.status(500).json({ success: false, message: "Failed to get test history" });
  }
}
