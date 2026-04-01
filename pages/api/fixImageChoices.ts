import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../lib/gemini-models";
import { getDb } from "../../server/db";
import { isEnvAdminEmail, isPlatformAdmin } from "../../server/platform-admin";
import { flattenChoiceText, fetchImageAsBase64 } from "../../server/explanation-helpers";
import { callWithRetry, isQuotaError } from "../../server/study-notes-helpers";
import {
  hasMixedTextAndImageChoices,
  removeDuplicateBlocks,
} from "../../lib/mixed-choice-helpers";
import { getSubjectDisplayName } from "../../lib/subject-display-names";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

const LETTERS = ["A", "B", "C", "D", "E"] as const;

function choiceHasImage(blocks: any[] | undefined): boolean {
  if (!Array.isArray(blocks)) return false;
  return blocks.some(
    (b) => b?.type === "image" && typeof b.url === "string" && b.url.trim().length > 0,
  );
}

/** Match client MarkdownWithMath so KaTeX/remark-math do not choke on double-escapes or empty $ $. */
function normalizeChoiceTextForRender(text: string): string {
  return String(text)
    .trim()
    .replace(/\\\\/g, "\\")
    .replace(/\$\$\s*\$\$/g, " ")
    .replace(/\$\s*\$/g, " ");
}

async function buildFixImageChoicesParts(question: any): Promise<any[]> {
  const subjectCode = question.subject_code || "";
  const subjectName = subjectCode ? getSubjectDisplayName(subjectCode) : "Unknown subject";
  const correctLabel = String.fromCharCode(65 + (question.answerIndex ?? 0));

  const parts: any[] = [];

  parts.push({
    text:
      `You are an expert AP exam content editor. This multiple-choice question has some answer choices as plain text and others as images (usually math). ` +
      `Your job is to produce text for every choice so students see consistent, accessible content — no images in answer choices.\n\n` +
      `Subject: ${subjectName} (${subjectCode})\n` +
      `Correct answer (do not change which is correct): ${correctLabel}\n\n` +
      `Output rules:\n` +
      `- Return ONLY valid JSON (no markdown fences). Shape: {"choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."}}\n` +
      `- For each letter, the string is what students will see (Markdown-compatible).\n` +
      `- For mathematical expressions, use LaTeX inside single dollar signs for inline math, e.g. $\\frac{2}{9}$ or $x^2\\sqrt{x^3+1}$. Use $...$ for any formula, fraction, integral, or symbolic math.\n` +
      `- For simple numeric or short word answers (e.g. -6, 6, "increase"), use plain text without dollar signs.\n` +
      `- Do NOT use backticks for math. Do NOT use HTML.\n` +
      `- For choices that are already plain text with no image, copy the existing text exactly (only fix obvious typos if any).\n` +
      `- For choices shown as images below, transcribe the math or text accurately as LaTeX/plain text per the rules above.\n` +
      `- Include every key A through E. Use empty string "" only if that choice is intentionally unused and empty in the source.\n\n` +
      `Question stem (text):\n`,
  });

  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    parts.push({ text: `${flattenChoiceText(question.prompt_blocks) || "(no text)"}\n\n` });
    for (const block of question.prompt_blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          parts.push({
            inlineData: { mimeType: "image/png", data: base64Data },
          });
          parts.push({ text: "\n(above: image from question stem — for context only)\n\n" });
        } catch (e) {
          console.error("fixImageChoices: stem image fetch failed", e);
        }
      }
    }
  } else if (typeof question.prompt === "string" && question.prompt.trim()) {
    parts.push({ text: `${question.prompt}\n\n` });
  }

  parts.push({ text: "Current answer choices (text only; images follow with labels):\n" });
  const choices = question.choices ?? {};
  for (const letter of LETTERS) {
    const blocks = Array.isArray(choices[letter]) ? choices[letter] : [];
    const t = flattenChoiceText(blocks) || "(no text)";
    const im = choiceHasImage(blocks);
    parts.push({ text: `${letter}. ${t}${im ? " [has image below]" : ""}\n` });
  }
  parts.push({ text: "\n" });

  for (const letter of LETTERS) {
    const blocks = Array.isArray(choices[letter]) ? choices[letter] : [];
    for (const block of blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          parts.push({ text: `Image for answer choice ${letter} only:\n` });
          parts.push({
            inlineData: { mimeType: "image/png", data: base64Data },
          });
          parts.push({ text: "\n" });
        } catch (e) {
          console.error(`fixImageChoices: choice ${letter} image fetch failed`, e);
        }
      }
    }
  }

  parts.push({
    text: `Now return the JSON object with "choices" for A–E. Remember: LaTeX math must be in $...$ so it renders in our app (remark-math / KaTeX).\nJSON:`,
  });

  return parts;
}

function parseChoicesJson(raw: string): Record<string, string> | null {
  let responseText = raw.trim();
  responseText = responseText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(responseText) as { choices?: Record<string, string> };
    const ch = parsed?.choices;
    if (!ch || typeof ch !== "object") return null;
    return ch;
  } catch {
    return null;
  }
}

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
  if (!isEnvAdminEmail(decoded.email)) {
    return res.status(403).json({ error: "Forbidden" });
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
    } catch {
      /* ignore */
    }
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
    message: `Starting fix image choices for ${total} questions...`,
  });

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (aborted) {
      console.log("Client disconnected, stopping fix image choices.");
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
      if (!hasMixedTextAndImageChoices(question.choices)) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: not mixed text+image choices, skipped`,
        });
        continue;
      }

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Fixing image choices Q${i + 1}/${total}...`,
      });

      const promptParts = await buildFixImageChoicesParts(question);

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
            updated,
            skipped,
            failed,
            message: `Rate limit — waiting ${waitSec}s (retry ${attempt}/5)...`,
          });
        },
      );

      let responseText = result.text?.trim() || "";
      const corrected = parseChoicesJson(responseText);
      if (!corrected) {
        failed++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: invalid JSON from model`,
        });
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const updatedChoices: Record<string, any[]> = { ...question.choices };
      const imageLetters = LETTERS.filter((L) =>
        choiceHasImage(Array.isArray(question.choices?.[L]) ? question.choices[L] : []),
      );

      let mergeOk = true;
      for (const letter of imageLetters) {
        const newText = corrected[letter];
        if (typeof newText !== "string") {
          mergeOk = false;
          failed++;
          sendEvent({
            type: "progress",
            current: i + 1,
            total,
            updated,
            skipped,
            failed,
            message: `Q${i + 1}/${total}: missing or invalid string for choice ${letter}`,
          });
          break;
        }
        updatedChoices[letter] = removeDuplicateBlocks([
          { type: "text", value: normalizeChoiceTextForRender(newText) },
        ]);
      }

      if (!mergeOk) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (imageLetters.length === 0) {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: no image choices to update`,
        });
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const existingTags = question.tags || [];
      const updatedTags = existingTags.includes("image_choices_fixed")
        ? existingTags
        : [...existingTags, "image_choices_fixed"];

      await doc.ref.update({
        choices: updatedChoices,
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
        message: `Updated ${updated} question(s) with text-only choices`,
      });
    } catch (error: any) {
      failed++;
      const msg = (error?.message || String(error)).slice(0, 120);
      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `Q${i + 1}/${total}: failed — ${msg}`,
      });
      if (!isQuotaError(error)) {
        console.error("fixImageChoices error", error);
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  sendEvent({
    type: "complete",
    total,
    updated,
    skipped,
    failed,
    message: `Done! Updated ${updated} question(s). ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}
