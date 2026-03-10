
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin } from "../../server/firebase-admin";
import { getModelName, getGeminiClientOptions } from "../../lib/gemini-models";

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

function flattenChoiceText(blocks: any[]) {
  return blocks
    .filter(b => b.type === "text")
    .map(b => b.value)
    .join(" ");
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

function formatTextContent(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let formatted = text;
  formatted = formatted.replace(/\s+/g, ' ');
  formatted = formatted.replace(/\s([.,!?;:])/g, '$1');
  formatted = formatted.replace(/([.,!?;:])([^\s])/g, '$1 $2');
  if (formatted.length > 0 && !formatted.match(/[.!?]$/) && formatted.length > 20) {
    formatted += '.';
  }
  formatted = formatted.replace(/(\d+)\s*([+\-*/^=])\s*(\d+)/g, '$1 $2 $3');
  return formatted.trim();
}

function deduplicateTextContent(text: string): string {
  if (!text || typeof text !== 'string') return text;
  const sentences = text.split(/([.!?]+\s+)/).filter(s => s.trim());
  const seen = new Set<string>();
  const uniqueSentences: string[] = [];
  for (const sentence of sentences) {
    const normalized = sentence.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      uniqueSentences.push(sentence);
    }
  }
  return uniqueSentences.join('');
}

function removeDuplicateBlocks(blocks: any[]): any[] {
  if (!blocks || blocks.length === 0) return blocks;
  const seen = new Set<string>();
  const uniqueBlocks: any[] = [];
  for (const block of blocks) {
    let key: string;
    if (block.type === "text") {
      const deduplicatedText = deduplicateTextContent(block.value);
      const formattedText = formatTextContent(deduplicatedText);
      key = `text:${formattedText}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push({ ...block, value: formattedText });
      }
    } else if (block.type === "image") {
      key = `image:${block.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      }
    } else {
      key = JSON.stringify(block);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      }
    }
  }
  return uniqueBlocks;
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
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { questionIds, model = "2.5lite" } = req.body || {};

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  const selectedModel = getModelName(model);
  console.log(`[ProcessQuestions] Using model: ${selectedModel}, processing ${questionIds.length} questions`);

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

  const padding = " ".repeat(2048) + "\n";
  res.write(padding);

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
  let processed = 0;

  sendEvent({
    type: "progress",
    current: 0, total, updated: 0, skipped: 0, failed: 0,
    message: `Starting processing for ${total} questions (fix formatting + generate explanations)...`,
  });

  const BATCH_SIZE = 5;

  async function processOneQuestion(questionId: string, idx: number): Promise<"updated" | "skipped"> {
    const doc = await questionsRef.doc(questionId).get();

    if (!doc.exists) {
      return "skipped";
    }

    const question = doc.data();

    const needsFix = true;
    const needsExplanation = true;

    const promptParts: any[] = [];

    let questionText = "";
    if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
      questionText = flattenChoiceText(question.prompt_blocks);
    }

    let choicesText = "";
    const choiceLetters: string[] = [];
    Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
      const ct = flattenChoiceText(blocks);
      choicesText += `${letter}. ${ct}\n`;
      choiceLetters.push(letter);
    });

    const correctLabel = String.fromCharCode(65 + question.answerIndex);
    const correctAnswerBlocks = question.choices?.[correctLabel];
    const correctAnswer = correctAnswerBlocks ? flattenChoiceText(correctAnswerBlocks) : "";

    const tasks: string[] = [];
    const jsonFields: string[] = [];

    if (needsFix) {
      tasks.push(`TASK - FIX FORMATTING:
Fix ONLY formatting issues in the question text and answer choices. Do NOT change any words.
Only fix: math notation, chemical formulas, symbols, spacing, punctuation spacing, missing periods.
Do NOT change words, rephrase, fix grammar, or add content.`);
      jsonFields.push(`"fixed_question": "the formatting-fixed question text"`);
      jsonFields.push(`"fixed_choices": {${choiceLetters.map(l => `"${l}": "formatting-fixed choice ${l}"`).join(", ")}}`);
    }

    if (needsExplanation) {
      tasks.push(`TASK - GENERATE EXPLANATION:
Generate a concise explanation (100-150 words). Structure: **Concept**: 1-2 sentences on what this tests. **Why ${correctLabel} is correct**: Why this answer is right; include key formula and calculations if applicable, then state the conclusion. **Why other choices are wrong**: A bulleted list with one bullet per incorrect choice; each bullet must start with the letter and "is incorrect because" (e.g. "A is incorrect because ..."). Use \\n for newlines; for the bullet list use "\\n- " before each bullet.
For math and equations use LaTeX inside single dollar signs, e.g. $P(t) = 1200 - 1000e^{-0.16t}$ or $\\frac{dP}{dt}$. Do not use backticks for math.`);
      jsonFields.push(`"explanation": "your concise explanation with \\n for newlines and \\n- for bullet lines"`);
    }

    let combinedPrompt = `You are an expert AP tutor. Process this AP exam question.

${tasks.join("\n\n")}

---

Question: ${questionText}

Answer Choices:
${choicesText}
Correct Answer: ${correctLabel}. ${correctAnswer}

---

IMPORTANT: Return ONLY valid JSON with no markdown, no code fences, no extra text. Use \\n for newlines within string values.

{
  ${jsonFields.join(",\n  ")}
}`;

    promptParts.push({ text: combinedPrompt });

    if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
      for (const block of question.prompt_blocks) {
        if (block.type === "image" && block.url) {
          try {
            const base64Data = await fetchImageAsBase64(block.url);
            promptParts.push({
              inlineData: {
                mimeType: "image/png",
                data: base64Data
              }
            });
          } catch (err) {
            console.error(`Failed to fetch image ${block.url}:`, err);
          }
        }
      }
    }

    for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
      for (const block of blocks as any[]) {
        if (block.type === "image" && block.url) {
          try {
            const base64Data = await fetchImageAsBase64(block.url);
            promptParts.push({
              inlineData: {
                mimeType: "image/png",
                data: base64Data
              }
            });
          } catch (err) {
            console.error(`Failed to fetch choice image ${block.url}:`, err);
          }
        }
      }
    }

    const result = await callWithRetry(
      () => ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: promptParts }],
      }),
      5, 5000,
      (attempt, waitSec) => {
        console.log(`Rate limit hit Q${idx + 1}, retry ${attempt}/5 — waiting ${waitSec}s...`);
      }
    );

    let responseText = result.text?.trim() || "";
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      responseText = responseText.substring(firstBrace, lastBrace + 1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      const sanitized = responseText
        .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\t' ? ch : '')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
      try {
        parsed = JSON.parse(sanitized);
      } catch {
        throw new Error(`JSON parse failed: ${(responseText).substring(0, 120)}...`);
      }
    }

    const updateData: any = { updatedAt: new Date() };

    if (needsFix && parsed.fixed_question) {
      const updatedPromptBlocks = question.prompt_blocks?.map((block: any) => {
        if (block.type === "text") {
          return { ...block, value: parsed.fixed_question };
        }
        return block;
      }) || [{ type: "text", value: parsed.fixed_question }];

      updateData.prompt_blocks = removeDuplicateBlocks(updatedPromptBlocks);

      if (parsed.fixed_choices) {
        const updatedChoices: any = {};
        for (const [letter, blocks] of Object.entries(question.choices ?? {})) {
          const correctedBlocks = (blocks as any[]).map((block: any) => {
            if (block.type === "text") {
              return { ...block, value: parsed.fixed_choices[letter] || block.value };
            }
            return block;
          });
          updatedChoices[letter] = removeDuplicateBlocks(correctedBlocks);
        }
        updateData.choices = updatedChoices;
      }

      const existingTags = question.tags || [];
      updateData.tags = existingTags.includes("prompt_fixed")
        ? existingTags
        : [...existingTags, "prompt_fixed"];
    }

    if (needsExplanation && parsed.explanation) {
      let explanation = parsed.explanation.trim();
      explanation = explanation.replace(/^Explanation:\s*/i, "").trim();
      updateData.explanation = explanation;
    }

    await doc.ref.update(updateData);
    console.log(`Processed question ${doc.id} (${idx + 1}/${total})`);
    return "updated";
  }

  for (let batchStart = 0; batchStart < questionIds.length; batchStart += BATCH_SIZE) {
    if (aborted) {
      console.log("Client disconnected, stopping processing.");
      break;
    }

    const batchEnd = Math.min(batchStart + BATCH_SIZE, questionIds.length);
    const batch = questionIds.slice(batchStart, batchEnd);

    sendEvent({ type: "progress", current: batchStart, total, updated, skipped, failed, message: `Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (Q${batchStart + 1}-${batchEnd})...` });

    const results = await Promise.allSettled(
      batch.map((questionId: string, batchIdx: number) =>
        processOneQuestion(questionId, batchStart + batchIdx)
      )
    );

    for (const result of results) {
      processed++;
      if (result.status === "fulfilled") {
        if (result.value === "updated") updated++;
        else if (result.value === "skipped") skipped++;
      } else {
        failed++;
        const error = result.reason;
        const isQuota = isQuotaError(error);
        console.error(`Failed to process question:`, isQuota ? "Quota exhausted" : error?.message);
      }
    }

    sendEvent({ type: "progress", current: processed, total, updated, skipped, failed, message: `Batch done — ${updated} updated, ${skipped} skipped, ${failed} failed (${processed}/${total})` });
  }

  console.log(`Completed: Processed ${updated}/${total} questions (${skipped} skipped, ${failed} failed)`);

  sendEvent({
    type: "complete",
    total, updated, skipped, failed,
    message: `Done! Processed ${updated} questions (fixed formatting + generated explanations). ${skipped} skipped, ${failed} failed.`,
  });

  res.end();
}
