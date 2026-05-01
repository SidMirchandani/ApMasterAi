import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import type FirebaseFirestore from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";
import { getModelName, getGeminiClientOptions } from "../../../lib/gemini-models";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { SUBJECT_SECTIONS } from "../../../server/subject-sections";
import {
  computeVarsityFingerprint,
  passageAndQuestionFromPromptBlocks,
} from "../../../server/varsity-content-fingerprint";
import { callWithRetry } from "../../../server/study-notes-helpers";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

const FIVE_OPTION_SUBJECTS = new Set(["APUSH", "APWORLD", "APEURO"]);
const MAX_LOOP_ITERATIONS = 150;
const BATCH_COMMIT_SIZE = 50;

type TextBlock = { type: "text"; value: string };

function stripModelJsonArray(raw: string): string {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  const idx = t.indexOf("[");
  if (idx > 0) t = t.slice(idx);
  const last = t.lastIndexOf("]");
  if (last >= 0) t = t.slice(0, last + 1);
  return t.trim();
}

function lettersForSubject(subjectCode: string): Array<"A" | "B" | "C" | "D" | "E"> {
  if (FIVE_OPTION_SUBJECTS.has(subjectCode)) {
    return ["A", "B", "C", "D", "E"];
  }
  return ["A", "B", "C", "D"];
}

function validateItem(
  item: unknown,
  letters: Array<"A" | "B" | "C" | "D" | "E">,
): { prompt: string; choices: Record<string, string>; correct: string; explanation: string } | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const prompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
  if (!prompt) return null;
  const explanation = typeof o.explanation === "string" ? o.explanation.trim() : "";
  const correct = typeof o.correct === "string" ? o.correct.trim().toUpperCase() : "";
  if (!letters.includes(correct as (typeof letters)[number])) return null;

  let choicesRaw = o.choices;
  if (!choicesRaw || typeof choicesRaw !== "object" || Array.isArray(choicesRaw)) {
    return null;
  }
  const choices: Record<string, string> = {};
  for (const L of letters) {
    const v = (choicesRaw as Record<string, unknown>)[L];
    if (typeof v !== "string" || !v.trim()) return null;
    choices[L] = v.trim();
  }
  return { prompt, choices, correct, explanation };
}

function buildPrompt(params: {
  subjectName: string;
  subjectCode: string;
  sectionCode: string;
  sectionName: string;
  batchSize: number;
  letters: Array<"A" | "B" | "C" | "D" | "E">;
}): string {
  const optionLine =
    params.letters.length === 5
      ? "Each question must have exactly five answer choices labeled A, B, C, D, and E."
      : "Each question must have exactly four answer choices labeled A, B, C, and D.";

  return `You are an expert AP exam writer. Generate ${params.batchSize} NEW, original multiple-choice questions for the AP course below.

Subject: ${params.subjectName} (${params.subjectCode})
Unit / section: ${params.sectionName} (section code: ${params.sectionCode})

Requirements:
- ${optionLine}
- Questions must align with what this unit covers on the real AP exam; vary difficulty (easy/medium/hard).
- Output ONLY a JSON array (no prose before or after). Each array element must be an object with EXACTLY these keys:
  - "prompt": string (the full question stem; may include short passages if appropriate for the subject)
  - "choices": object with string values for keys ${params.letters.join(", ")}
  - "correct": string, one of ${params.letters.join(", ")}
  - "explanation": string (2–5 sentences; explain why the correct answer is right and why common distractors fail)

Do not wrap the JSON in markdown unless you must — prefer raw JSON only.`;
}

async function loadSectionFingerprints(
  firestore: FirebaseFirestore.Firestore,
  subjectCode: string,
  sectionCode: string,
): Promise<Set<string>> {
  const set = new Set<string>();
  const snap = await firestore
    .collection("questions")
    .where("subject_code", "==", subjectCode)
    .where("section_code", "==", sectionCode)
    .select("vt_content_hash")
    .get();
  snap.forEach((doc) => {
    const h = doc.get("vt_content_hash");
    if (typeof h === "string" && h.length > 0) set.add(h);
  });
  return set;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = getDb();
  if (!(await isPlatformAdmin(db, admin.email, admin.uid ?? null))) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const body = req.body || {};
  const subjectCode = typeof body.subjectCode === "string" ? body.subjectCode.trim() : "";
  const sectionCode = typeof body.sectionCode === "string" ? body.sectionCode.trim() : "";
  const targetCountRaw = body.targetCount;
  const targetCount =
    typeof targetCountRaw === "number"
      ? targetCountRaw
      : typeof targetCountRaw === "string"
        ? parseInt(targetCountRaw, 10)
        : NaN;
  const modelSel = typeof body.model === "string" ? body.model : "2.5lite";

  if (!subjectCode || !sectionCode) {
    return res.status(400).json({ error: "subjectCode and sectionCode are required" });
  }
  if (!Number.isFinite(targetCount) || targetCount < 1 || targetCount > 40) {
    return res.status(400).json({ error: "targetCount must be between 1 and 40" });
  }

  const sectionDefs = SUBJECT_SECTIONS[subjectCode];
  if (!sectionDefs?.length) {
    return res.status(400).json({ error: "Unknown subject" });
  }
  const sectionDef = sectionDefs.find((s) => s.code === sectionCode);
  if (!sectionDef) {
    return res.status(400).json({ error: "Invalid sectionCode for this subject" });
  }

  const opts = getGeminiClientOptions();
  if (!opts.apiKey) {
    return res.status(500).json({
      error: "Gemini API not configured (set GEMINI_API_KEY or AI integration env vars)",
    });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }

  const { firestore } = firebaseAdmin;
  const selectedModel = getModelName(modelSel);
  const ai = new GoogleGenAI({
    apiKey: opts.apiKey,
    ...(opts.httpOptions && { httpOptions: opts.httpOptions }),
  });

  const letters = lettersForSubject(subjectCode);
  const subjectName = getSubjectDisplayName(subjectCode) || subjectCode;

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

  const sendEvent = (data: Record<string, unknown>) => {
    if (aborted) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch {
      // ignore broken pipe
    }
  };

  try {
    const fingerprintSet = await loadSectionFingerprints(firestore, subjectCode, sectionCode);

    sendEvent({
      type: "status",
      message: `Starting GenAI top-up for ${subjectCode} / ${sectionCode} (target ${targetCount})…`,
      saved: 0,
      target: targetCount,
    });

    let saved = 0;
    let loopIteration = 0;
    let batch = firestore.batch();
    let batchCount = 0;

    const flushBatch = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = firestore.batch();
      batchCount = 0;
    };

    while (saved < targetCount && loopIteration < MAX_LOOP_ITERATIONS && !aborted) {
      loopIteration++;
      const remaining = targetCount - saved;
      const batchAsk = Math.min(5, remaining);

      sendEvent({
        type: "progress",
        message: `Generating batch (${batchAsk} requested)…`,
        saved,
        target: targetCount,
        current: saved,
        total: targetCount,
      });

      const promptText = buildPrompt({
        subjectName,
        subjectCode,
        sectionCode,
        sectionName: sectionDef.name,
        batchSize: batchAsk,
        letters,
      });

      let textOut: string;
      try {
        const result = await callWithRetry(
          () =>
            ai.models.generateContent({
              model: selectedModel,
              contents: promptText,
            }),
          5,
          5000,
          (attempt, waitSec) => {
            sendEvent({
              type: "rate_limit",
              message: `Rate limit — retrying in ${waitSec}s (attempt ${attempt}/5)…`,
              saved,
              target: targetCount,
            });
          },
        );
        textOut = (result.text || "").trim();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendEvent({ type: "error", message: `Gemini request failed: ${msg}` });
        await flushBatch().catch(() => {});
        res.end();
        return;
      }

      if (!textOut) {
        sendEvent({
          type: "progress",
          message: "Empty model response, retrying…",
          saved,
          target: targetCount,
        });
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripModelJsonArray(textOut));
      } catch {
        sendEvent({
          type: "progress",
          message: "Could not parse JSON from model, retrying…",
          saved,
          target: targetCount,
        });
        continue;
      }

      if (!Array.isArray(parsed)) {
        sendEvent({
          type: "progress",
          message: "Model did not return a JSON array, retrying…",
          saved,
          target: targetCount,
        });
        continue;
      }

      let acceptedThisRound = 0;
      for (const item of parsed) {
        if (saved >= targetCount || aborted) break;

        const v = validateItem(item, letters);
        if (!v) continue;

        const promptBlocks: TextBlock[] = [{ type: "text", value: v.prompt }];
        const choices: Record<"A" | "B" | "C" | "D" | "E", TextBlock[]> = {
          A: [],
          B: [],
          C: [],
          D: [],
          E: [],
        };
        for (const L of letters) {
          choices[L] = [{ type: "text", value: v.choices[L] || "" }];
        }

        const { passage, question, graphicUrl } = passageAndQuestionFromPromptBlocks(promptBlocks);
        const fp = computeVarsityFingerprint(passage, question, graphicUrl);
        if (fingerprintSet.has(fp)) {
          continue;
        }

        const answerIndex = letters.indexOf(v.correct as (typeof letters)[number]);
        if (answerIndex < 0) continue;

        const questionId =
          Math.floor(100000000 + Math.random() * 899999999) % 2000000000;
        const docId = `${subjectCode}_${sectionCode}_genai_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

        batch.set(
          firestore.collection("questions").doc(docId),
          {
            subject_code: subjectCode,
            section_code: sectionCode,
            question_id: questionId,
            prompt_blocks: promptBlocks,
            choices,
            answerIndex,
            mode: "SECTION",
            test_slug: "",
            tags: ["Source:VarsityTutor", "genai_topup"],
            source: "GenAI",
            explanation: v.explanation,
            vt_content_hash: fp,
            updatedAt: new Date(),
            rand: Math.random(),
          },
          { merge: true },
        );

        batchCount++;
        fingerprintSet.add(fp);
        saved++;
        acceptedThisRound++;

        if (batchCount >= BATCH_COMMIT_SIZE) {
          await flushBatch();
          sendEvent({
            type: "progress",
            message: `Saved ${saved} / ${targetCount}…`,
            saved,
            target: targetCount,
            current: saved,
            total: targetCount,
          });
        }
      }

      if (acceptedThisRound === 0) {
        sendEvent({
          type: "progress",
          message: "No valid questions in this batch, retrying…",
          saved,
          target: targetCount,
        });
      } else {
        sendEvent({
          type: "progress",
          message: `Saved ${saved} / ${targetCount}…`,
          saved,
          target: targetCount,
          current: saved,
          total: targetCount,
        });
      }
    }

    await flushBatch();

    if (aborted) {
      sendEvent({
        type: "complete",
        saved,
        target: targetCount,
        message: `Stopped after ${saved} question(s) (client disconnected).`,
      });
      res.end();
      return;
    }

    if (saved < targetCount && loopIteration >= MAX_LOOP_ITERATIONS) {
      sendEvent({
        type: "error",
        message: `Stopped after ${MAX_LOOP_ITERATIONS} attempts with ${saved}/${targetCount} saved.`,
        saved,
        target: targetCount,
      });
      res.end();
      return;
    }

    sendEvent({
      type: "complete",
      saved,
      target: targetCount,
      message: `Done. Added ${saved} question(s) for ${sectionCode}.`,
    });
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent({ type: "error", message: msg || "GenAI top-up failed" });
    res.end();
  }
}
