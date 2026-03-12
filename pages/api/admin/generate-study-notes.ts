import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../../lib/gemini-models";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

function flattenPromptText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.value)
    .join(" ");
}

function isQuotaError(error: any): boolean {
  const msg = (error?.message || error?.toString() || "").toLowerCase();
  const status = error?.status || error?.code || error?.httpCode || 0;
  if (status === 429 || status === "429") return true;
  return msg.includes("quota") || msg.includes("rate") || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("too many requests") || msg.includes("limit");
}

async function callWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 5,
  baseDelayMs: number = 5000,
  onRetry?: (attempt: number, waitSec: number) => void
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (isQuotaError(error) && attempt < maxRetries) {
        const waitMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 2000;
        const waitSec = Math.round(waitMs / 1000);
        onRetry?.(attempt + 1, waitSec);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const STUDY_NOTE_PROMPT = `You are an Expert AP Exam Tutor. Your task is to write a "Study Note" that TEACHES THE CONCEPT so the student can apply it to any similar question. The note must be a reusable lesson—not a walkthrough of this specific question's answer.

**Critical:** Do NOT work through the question's numbers or plug in the given values and solve. Use the question only to identify which concept and formula to teach. Your note should teach the general principle and procedure (e.g. "When you see X, do Y; the rule is Z") so the student can solve this type of problem on their own. Illustrate with the relationship and logic in general terms, not with this question's specific values.

Subject: {{SUBJECT}}

Guidelines:
- **Core Concept:** Clearly define the overarching concept or rule. Explain what it means and why it matters—teach the idea, not just the fact.
- **How-To:** Give the general steps or logic to tackle this type of problem (e.g. "To find X, first identify Y, then apply the formula…"). Do not substitute the actual numbers from the question; teach the method.
- **Quantitative (Chem, Physics, Calc, Econ):** State the formula in general form with LaTeX ($...$ for inline, $$...$$ for display). Define each variable and explain the relationship. Outline the calculation steps in general (e.g. "rearrange for the unknown, then take the antilog"). Do not work through this question's specific numbers—teach how to use the formula for any problem of this type.
- **Qualitative (History, Gov, Psych, Bio):** Explain the framework, cause–effect, or context that makes the right answer correct and others wrong—in general terms the student can reuse.
- **Trick:** Briefly call out common traps or misconceptions for this type of question.
- **Tone:** Scannable, encouraging, test-prep only. 2–3 paragraphs, 5–6 sentences. Plain text; line breaks between paragraphs. No "Study Note:" or section labels. Use only LaTeX $...$ and $$...$$ for math—no other equation syntax.

Question (for context only—teach the concept, do not answer it step-by-step):
{{QUESTION}}

Correct Answer: {{ANSWER}}

Explanation (reference only):
{{EXPLANATION}}

Study Note (teach the concept; plain text; use $...$ and $$...$$ for equations):`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded: { email?: string | null };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (!isAllowed(decoded.email)) {
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
  req.on("close", () => { aborted = true; });

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

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  sendEvent({
    type: "progress",
    current: 0,
    total,
    updated: 0,
    skipped: 0,
    failed: 0,
    message: `Starting study notes generation for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
      console.log("Client disconnected, stopping study notes generation.");
      break;
    }

    try {
      const doc = await questionsRef.doc(questionId).get();

      if (!doc.exists) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: not found, skipped`,
        });
        continue;
      }

      const question = doc.data() as any;
      const questionText = question.prompt_blocks
        ? flattenPromptText(question.prompt_blocks)
        : (question.prompt || "");
      const answer = question.correct_answer || (question.answerIndex != null ? String.fromCharCode(65 + Number(question.answerIndex)) : "");
      const explanation = question.explanation || "";

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Generating study note for Q${i + 1}/${total}...`,
      });

      const subjectName = getSubjectDisplayName(question.subject_code || "") || "AP";
      const promptText = STUDY_NOTE_PROMPT.replace("{{SUBJECT}}", subjectName)
        .replace("{{QUESTION}}", questionText)
        .replace("{{ANSWER}}", answer)
        .replace("{{EXPLANATION}}", explanation);

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
            current: i + 1,
            total,
            updated,
            skipped,
            failed,
            message: `Rate limit hit — waiting ${waitSec}s before retry ${attempt}/5...`,
          });
        }
      );

      const paragraph = (result.text || "").trim();
      if (!paragraph) {
        failed++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}: Empty response, skipped`,
        });
        continue;
      }

      const existingTags: string[] = question.tags || [];
      const otherTags = existingTags.filter(
        (t: string) => typeof t !== "string" || !t.startsWith("study_note:")
      );
      const updatedTags = [...otherTags, `study_note: ${paragraph}`];

      await doc.ref.update({
        tags: updatedTags,
        updatedAt: new Date(),
      });

      updated++;
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Generated ${updated}/${total - skipped} study notes`,
      });
    } catch (error: any) {
      failed++;
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Q${i + 1}: Failed — ${(error.message || "").substring(0, 80)}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Generated ${updated} study notes. ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}
