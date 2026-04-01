import { isQuotaError, callWithRetry } from "./study-notes-helpers";

export function flattenChoiceText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.value)
    .join(" ");
}

export async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export { isQuotaError, callWithRetry };

export async function buildExplanationPromptParts(question: any): Promise<{
  promptParts: any[];
  correctLabel: string;
}> {
  const correctLabel = String.fromCharCode(65 + (question.answerIndex ?? 0));
  const promptParts: any[] = [];

  let promptText = `You are an expert AP tutor. Generate a clear, structured explanation for this AP question.\n\n`;
  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    const questionText = flattenChoiceText(question.prompt_blocks);
    promptText += `Question: ${questionText}\n`;
  }
  promptParts.push({ text: promptText });

  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    for (const block of question.prompt_blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          promptParts.push({
            inlineData: {
              mimeType: "image/png",
              data: base64Data,
            },
          });
        } catch (err) {
          console.error(`Failed to fetch image ${block.url}:`, err);
        }
      }
    }
  }

  let choicesText = `\nAnswer Choices:\n`;
  Object.entries(question.choices ?? {}).forEach(([letter, blocks]: [string, any]) => {
    const choiceText = flattenChoiceText(blocks);
    choicesText += `${letter}. ${choiceText}\n`;
  });
  const correctAnswerBlocks = question.choices?.[correctLabel];
  const correctAnswer = correctAnswerBlocks ? flattenChoiceText(correctAnswerBlocks) : "";
  choicesText += `\nCorrect Answer: ${correctLabel}. ${correctAnswer}\n\n`;
  promptParts.push({ text: choicesText });

  for (const [, blocks] of Object.entries(question.choices ?? {})) {
    for (const block of blocks as any[]) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          promptParts.push({
            inlineData: {
              mimeType: "image/png",
              data: base64Data,
            },
          });
        } catch (err) {
          console.error(`Failed to fetch choice image ${block.url}:`, err);
        }
      }
    }
  }

  promptParts.push({
    text: `\nProvide a concise explanation following this structure (do NOT number the sections):

**Concept**: In 1-2 sentences, briefly explain what concept this question tests.

**Why ${correctLabel} is correct**: Clearly explain why this answer is right. Include the key formula and any calculations if applicable, then state the conclusion (e.g. "Therefore, ...").

**Why other choices are wrong**: Give a bulleted list with one bullet per incorrect choice. Each bullet must start with the letter and "is incorrect because" (e.g. "A is incorrect because ...", "B is incorrect because ..."). Use markdown bullets: start each line with "- ".

Keep the ENTIRE explanation to about 100-150 words maximum. Be clear, concise, and student-friendly.

For math and equations use LaTeX inside single dollar signs, e.g. $P(t) = 1200 - 1000e^{-0.16t}$ or $\\frac{dP}{dt}$. Do not use backticks for math.

Your explanation:`,
  });

  return { promptParts, correctLabel };
}

export type RunExplanationGenerationParams = {
  questionIds: string[];
  model: string;
  ai: { models: { generateContent: (opts: any) => Promise<{ text?: string }> } };
  questionsRef: any;
  sendEvent: (data: any) => void;
  skipIfExplanationExists: boolean;
  isRegenerate: boolean;
  onAborted: () => boolean;
  markVerificationFailOnError?: boolean;
};

export async function runExplanationGeneration({
  questionIds,
  model,
  ai,
  questionsRef,
  sendEvent,
  skipIfExplanationExists,
  isRegenerate,
  onAborted,
  markVerificationFailOnError = false,
}: RunExplanationGenerationParams): Promise<{ updated: number; skipped: number; failed: number }> {
  const total = questionIds.length;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const verb = isRegenerate ? "Re-generating" : "Generating";
  const verbPast = isRegenerate ? "Re-generated" : "Generated";

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (onAborted()) {
      console.log(`Client disconnected, stopping explanation ${isRegenerate ? "re-" : ""}generation.`);
      break;
    }

    try {
      const doc = await questionsRef.doc(questionId).get();

      if (!doc.exists) {
        console.log(`Question ${questionId} not found, skipping...`);
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

      const question = doc.data();
      if (!question) continue;

      if (skipIfExplanationExists && question?.explanation && String(question.explanation).trim() !== "") {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: already has explanation, skipped`,
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
        message: `${verb} explanation ${i + 1}/${total}...`,
      });

      const { promptParts } = await buildExplanationPromptParts(question);

      const result = await callWithRetry(
        () =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: promptParts }],
          }),
        5,
        5000,
        (attempt, waitSec) => {
          console.log(`⏳ Quota limit hit, retry ${attempt}/5 — waiting ${waitSec}s...`);
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

      let explanation = (result.text ?? "").trim();
      explanation = explanation.replace(/^Explanation:\s*/i, "").trim();

      await doc.ref.update({
        explanation,
        updatedAt: new Date(),
      });

      updated++;
      console.log(`✓ ${verbPast} explanation for question ${doc.id}`);

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: `${verbPast} ${updated}/${total - skipped} explanations`,
      });
    } catch (error: any) {
      failed++;
      const isQuota = isQuotaError(error);
      console.error(
        `✗ Failed to ${isRegenerate ? "re-" : ""}generate explanation for ${questionId}:`,
        isQuota ? "Quota exhausted after retries" : error.message
      );

      if (markVerificationFailOnError) {
        try {
          await questionsRef.doc(questionId).set(
            {
              lastVerification: {
                verifiedAt: new Date(),
                source: isRegenerate ? "explanation_regen" : "explanation_gen",
                model,
                status: "fail",
                lintErrors: [],
                lintWarnings: [],
                imageErrors: [],
                issues: [
                  isQuota
                    ? "Explanation generation quota exhausted after retries"
                    : (error?.message || "Explanation generation failed").slice(0, 500),
                ],
                checks: null,
                confidence: null,
              },
              updatedAt: new Date(),
            },
            { merge: true },
          );
        } catch {}
      }

      sendEvent({
        type: "progress",
        current: i + 1,
        total,
        updated,
        skipped,
        failed,
        message: isQuota
          ? `Q${i + 1}: Quota exhausted after retries — skipped`
          : `Q${i + 1}: Failed — ${(error.message || "").substring(0, 80)}`,
      });
    }
  }

  return { updated, skipped, failed };
}
