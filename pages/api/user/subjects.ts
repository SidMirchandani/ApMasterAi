import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";
import {
  getUserSubjectsForUser,
  hasUserSubjectForUser,
  addUserSubjectForUser,
} from "../../../server/services/user-subjects-service";
import { assertNotBanned } from "../../../server/api-user-auth";
import { verifyFirebaseToken } from "../../../server/firebase-admin";
import { z } from "zod";
import type { UserSubject } from "../../../server/storage";
import { getClientIp } from "../../../server/client-ip";
import { tryGetDb } from "../../../server/db";

// Define the schema inline since the shared schema import is not working
const insertUserSubjectSchema = z.object({
  userId: z.string(),
  subjectId: z.string(),
  name: z.string(),
  description: z.string().optional().default(""),
  units: z.number().min(1).max(20),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional().default("Medium"),
  examDate: z.string(),
  progress: z.number().min(0).max(100).optional().default(0),
  masteryLevel: z.number().min(0).max(100).optional().default(0),
});

function shouldIncludeTestHistory(req: NextApiRequest): boolean {
  const value = req.query.includeTestHistory;
  return value === "1" || value === "true";
}

function dateToMillis(value: any): number {
  if (value?.toMillis) return value.toMillis();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

const DASHBOARD_HISTORY_FIELDS = [
  "id",
  "date",
  "score",
  "percentage",
  "totalQuestions",
  "type",
  "sectionBreakdown",
  "unitId",
  "sectionCode",
] as const;

function normalizeDashboardHistoryTest(
  testDoc: FirebaseFirestore.QueryDocumentSnapshot,
  subjectId: string,
  type: "full-length" | "diagnostic" | "unit",
) {
  const test = testDoc.data();
  const sectionCode = typeof test.sectionCode === "string" ? test.sectionCode : undefined;
  const sectionBreakdown =
    test.sectionBreakdown && typeof test.sectionBreakdown === "object"
      ? test.sectionBreakdown
      : {};

  return {
    id: typeof test.id === "string" ? test.id : testDoc.id,
    date: test.date,
    score: typeof test.score === "number" ? test.score : 0,
    percentage: typeof test.percentage === "number" ? test.percentage : 0,
    totalQuestions: typeof test.totalQuestions === "number" ? test.totalQuestions : 0,
    subjectId,
    type,
    sectionBreakdown,
    ...(type === "unit" && {
      unitId: typeof test.unitId === "string" ? test.unitId : undefined,
      sectionCode,
      unitNumber: sectionCode ? sectionBreakdown?.[sectionCode]?.unitNumber : undefined,
    }),
  };
}

async function getFastPathTestHistory(subject: UserSubject) {
  const db = tryGetDb();
  if (!db) return [];

  const subjectId = subject.subjectId;
  const subjectRef = db.collection("user_subjects").doc(String(subject.id));
  const [fullLengthTests, diagnosticTests, unitQuizResults] =
    await Promise.all([
      subjectRef
        .collection("fullLengthTests")
        .orderBy("date", "asc")
        .select(...DASHBOARD_HISTORY_FIELDS)
        .get(),
      subjectRef
        .collection("diagnosticTests")
        .orderBy("date", "asc")
        .select(...DASHBOARD_HISTORY_FIELDS)
        .get(),
      subjectRef
        .collection("unitQuizResults")
        .orderBy("date", "asc")
        .select(...DASHBOARD_HISTORY_FIELDS)
        .get(),
    ]);

  const combined = [
    ...fullLengthTests.docs.map((doc) =>
      normalizeDashboardHistoryTest(doc, subjectId, "full-length"),
    ),
    ...diagnosticTests.docs.map((doc) =>
      normalizeDashboardHistoryTest(doc, subjectId, "diagnostic"),
    ),
    ...unitQuizResults.docs.map((doc) =>
      normalizeDashboardHistoryTest(doc, subjectId, "unit"),
    ),
  ].sort((a, b) => dateToMillis(a.date) - dateToMillis(b.date));

  return combined.map((test, index) => ({ ...test, testNumber: index + 1 }));
}

async function getTestHistoryBySubject(
  subjects: UserSubject[],
) {
  const entries = await Promise.all(
    subjects.map(async (subject) => [
      subject.subjectId,
      await getFastPathTestHistory(subject),
    ] as const),
  );

  return Object.fromEntries(entries);
}

function logDashboardSubjectsTiming(
  label: string,
  data: Record<string, number | string>,
) {
  if (process.env.NODE_ENV !== "development") return;
  const details = Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.info(`[subjects API][dashboard] ${label} ${details}`);
}

async function getOrCreateUser(
  firebaseUid: string,
  req: NextApiRequest,
): Promise<string> {
  try {
    let user = await storage.getUserByFirebaseUid(firebaseUid);

    if (!user) {
      user = await storage.createUser(
        firebaseUid,
        `${firebaseUid}@firebase.user`,
        firebaseUid,
        getClientIp(req),
      );
    }

    return user.id;
  } catch (error) {
    console.error("[subjects API] Error in getOrCreateUser:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;

  // Verify Firebase token first
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required - missing token",
    });
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = await verifyFirebaseToken(token);
  } catch (error) {
    console.error("[subjects API] Token verification failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  if (!(await assertNotBanned(res, decodedToken.uid))) return;

  const firebaseUid = decodedToken.uid;

  try {
    const userId = await getOrCreateUser(firebaseUid, req);

    switch (method) {
      case "GET": {
        try {
          const startedAt = Date.now();
          const subjects = await getUserSubjectsForUser(userId);
          if (shouldIncludeTestHistory(req)) {
            const subjectsLoadedAt = Date.now();
            const testHistoryBySubject = await getTestHistoryBySubject(subjects);
            const finishedAt = Date.now();
            const totalHistoryRows = Object.values(testHistoryBySubject).reduce(
              (sum, history) => sum + history.length,
              0,
            );
            logDashboardSubjectsTiming("includeTestHistory", {
              subjects: subjects.length,
              historyRows: totalHistoryRows,
              subjectsMs: subjectsLoadedAt - startedAt,
              historyMs: finishedAt - subjectsLoadedAt,
              totalMs: finishedAt - startedAt,
            });
            res.setHeader("Cache-Control", "no-store");
            return res.json({ success: true, data: subjects, testHistoryBySubject });
          }

          res.setHeader(
            "Cache-Control",
            "public, s-maxage=60, stale-while-revalidate=300",
          );
          return res.json({ success: true, data: subjects });
        } catch (error) {
          console.error("[subjects API][GET] Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to load subjects from database",
          });
        }
      }

      case "POST": {
        try {
          const hasSubject = await hasUserSubjectForUser(
            userId,
            req.body.subjectId,
          );
          if (hasSubject) {
            return res.status(409).json({
              success: false,
              message: "Subject already added to dashboard",
            });
          }

          const validatedData = insertUserSubjectSchema.parse({
            ...req.body,
            userId,
          }) as Omit<UserSubject, "id" | "dateAdded" | "unitProgress">;

          const subject = await addUserSubjectForUser(validatedData);

          return res.json({
            success: true,
            message: "Subject added to dashboard!",
            data: subject,
          });
        } catch (error) {
          console.error("[subjects API][POST] Error:", error);
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              success: false,
              message: "Invalid subject data",
              errors: error.errors,
            });
          }
          return res.status(500).json({
            success: false,
            message: "Failed to add subject to database",
          });
        }
      }

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`,
        });
    }
  } catch (error) {
    console.error(`[subjects API][${req.method}] Unhandled error:`, error);

    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Database") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("Firestore") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("access token")
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Database temporarily unavailable. This is likely due to Firebase configuration in development mode.",
        error:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        retryAfter: 5000,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
