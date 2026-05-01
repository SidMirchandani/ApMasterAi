import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../../lib/gemini-models";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";
import {
  lintQuestion,
  verifyImageUrlsReachable,
  collectAllImageUrls,
  buildVerificationPromptParts,
  parseVerificationJson,
  callWithRetry,
  isQuotaError,
} from "../../../server/verification-helpers";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded: { email?: string | null; uid?: string };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const db = getDb();
  if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const { questionIds, model = "2.5lite" } = req.body || {};

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);
  const opts = getGeminiClientOptions();
  const ai = new GoogleGenAI({
    apiKey: opts.apiKey,
    ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
  });

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const { firestore } = firebaseAdmin;
  const questionsRef = firestore.collection("questions");
  const total = questionIds.length;

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const sendEvent = (data: any) => {
    if (aborted) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch {}
  };

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated: 0,
    skipped: 0,
    failed: 0,
    passed: 0,
    message: `Starting verification for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    if (aborted) break;

    const questionId = questionIds[i];

    try {
      const doc = await questionsRef.doc(questionId).get();
      if (!doc.exists) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          skipped,
          failed,
          passed,
          updated: passed + failed,
          message: `Q${i + 1}/${total}: not found, skipped`,
        });
        continue;
      }

      const question = doc.data();
      if (!question) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          skipped,
          failed,
          passed,
          updated: passed + failed,
          message: `Q${i + 1}/${total}: empty doc, skipped`,
        });
        continue;
      }

      const lint = lintQuestion(question);
      const urls = collectAllImageUrls(question);
      let imageErrors: string[] = [];
      if (lint.ok && urls.length > 0) {
        const imgCheck = await verifyImageUrlsReachable(urls);
        imageErrors = imgCheck.errors;
      }

      if (!lint.ok || imageErrors.length > 0) {
        const allIssues = [...lint.errors, ...imageErrors];
        const status = "fail" as const;
        failed++;
        await doc.ref.set(
          {
            lastVerification: {
              verifiedAt: new Date(),
              source: "lint",
              model: null,
              status,
              lintErrors: lint.errors,
              lintWarnings: lint.warnings,
              imageErrors,
              issues: allIssues,
              checks: null,
              confidence: null,
            },
            updatedAt: new Date(),
          },
          { merge: true },
        );

        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          skipped,
          failed,
          passed,
          updated: passed + failed,
          message: `Q${i + 1}/${total}: lint/data fail (${allIssues[0]?.slice(0, 60) || "error"}…)`,
        });
        continue;
      }

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        skipped,
        failed,
        passed,
        updated: passed + failed,
        message: `Q${i + 1}/${total}: calling model…`,
      });

      const { promptParts } = await buildVerificationPromptParts(question);

      const result = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: selectedModel,
            contents: [{ role: "user", parts: promptParts }],
          }),
        5,
        5000,
        (attempt, waitSec) => {
          sendEvent({
            type: "rate_limit",
            current: i + 1,
            total,
            skipped,
            failed,
            passed,
            updated: passed + failed,
            message: `Rate limit — waiting ${waitSec}s (retry ${attempt}/5)…`,
          });
        },
      );

      const rawText = (result.text ?? "").trim();
      const parsed = parseVerificationJson(rawText);

      if (!parsed) {
        failed++;
        await doc.ref.set(
          {
            lastVerification: {
              verifiedAt: new Date(),
              source: "ai",
              model: selectedModel,
              status: "error",
              lintErrors: [],
              lintWarnings: lint.warnings,
              imageErrors: [],
              issues: [`Invalid model JSON: ${rawText.slice(0, 200)}`],
              checks: null,
              confidence: null,
            },
            updatedAt: new Date(),
          },
          { merge: true },
        );
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          skipped,
          failed,
          passed,
          updated: passed + failed,
          message: `Q${i + 1}/${total}: malformed AI response`,
        });
        continue;
      }

      const mergedIssues = [...lint.warnings.map((w) => `Warning: ${w}`), ...parsed.issues];
      const finalStatus: "pass" | "fail" =
        parsed.status === "pass" && lint.warnings.length > 0 ? "fail" : parsed.status;

      if (finalStatus === "pass") passed++;
      else failed++;

      await doc.ref.set(
        {
          lastVerification: {
            verifiedAt: new Date(),
            source: "ai",
            model: selectedModel,
            status: finalStatus,
            lintErrors: [],
            lintWarnings: lint.warnings,
            imageErrors: [],
            issues: mergedIssues,
            checks: parsed.checks,
            confidence: parsed.confidence,
          },
          updatedAt: new Date(),
        },
        { merge: true },
      );

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        skipped,
        failed,
        passed,
        updated: passed + failed,
        message: `Q${i + 1}/${total}: ${finalStatus} (pass ${passed}, fail ${failed})`,
      });
    } catch (error: any) {
      const quota = isQuotaError(error);
      failed++;
      try {
        await questionsRef.doc(questionId).set(
          {
            lastVerification: {
              verifiedAt: new Date(),
              source: "ai",
              model: selectedModel,
              status: "error",
              lintErrors: [],
              lintWarnings: [],
              imageErrors: [],
              issues: [quota ? "Quota exhausted after retries" : (error?.message || "Unknown error").slice(0, 500)],
              checks: null,
              confidence: null,
            },
            updatedAt: new Date(),
          },
          { merge: true },
        );
      } catch {}

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        skipped,
        failed,
        passed,
        updated: passed + failed,
        message: quota
          ? `Q${i + 1}/${total}: quota exhausted`
          : `Q${i + 1}/${total}: ${(error?.message || "").slice(0, 80)}`,
      });
    }
  }

  sendEvent({
    type: "complete",
    total,
    skipped,
    failed,
    passed,
    updated: passed + failed,
    message: `Done. Pass: ${passed}, failed: ${failed}, skipped: ${skipped}.`,
  });

  res.end();
}
