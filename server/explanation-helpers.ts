import { isQuotaError, callWithRetry } from "./study-notes-helpers";

const SUBJECT_CONCEPT_REGISTRY: Record<string, string> = {
  ap_csa:
    "AP Computer Science A skills, specifically abstraction and program design through selecting appropriate method signatures, parameters, and return types.",
  ap_csp:
    "AP Computer Science Principles skills, focusing on algorithms, data representation, and program behavior.",
  ap_bio:
    "AP Biology skills, focusing on interpreting experimental results, population dynamics, and biological mechanisms.",
  ap_physics:
    "AP Physics skills, focusing on applying quantitative models and physical principles to real-world scenarios.",
  ap_stats:
    "AP Statistics skills, focusing on data interpretation, statistical reasoning, and inference.",
};

const BASE_EXPLANATION_PREAMBLE =
  "You are an expert AP Exam Tutor. Your task is to generate explanations for AP multiple-choice questions.";

const BASE_EXPLANATION_STYLE =
  "Your explanations must be highly scannable, focus heavily on the core concept, and provide actionable test-taking strategies. You must strictly follow the 4-part structure below for EVERY explanation. Do not deviate from these headings.";

const BASE_EXPLANATION_FOOTER =
  "Keep the ENTIRE explanation to about 100–150 words maximum. Be clear, concise, and student-friendly.\n\nFor math and equations use LaTeX inside single dollar signs, e.g. $P(t) = 1200 - 1000e^{-0.16t}$ or $\\frac{dP}{dt}$. Do not use backticks for math.\n\nYour explanation:";

export function flattenChoiceText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.value)
    .join(" ");
}

function buildConceptHalfInstruction(question: any): string {
  const subjectCode = (
    question?.subject_code ||
    question?.subject ||
    ""
  ).toString();
  const normalizedCode = subjectCode.toLowerCase();
  const subjectDescription =
    SUBJECT_CONCEPT_REGISTRY[normalizedCode] ||
    (subjectCode
      ? `AP-level skills in ${subjectCode}, focusing on the core concept the question is targeting.`
      : "AP-level skills, focusing on the core concept the question is targeting.");

  return `**Concept:**\nProvide a brief, 1–2 sentence reminder of the overarching concept being tested. Keep it high-level and frame it in terms of ${subjectDescription}, not the specific answer choices.`;
}

function buildQuestionHalfInstruction(correctLabel: string): string {
  return `**Why ${correctLabel} is correct:**\nProvide a concise, 1–3 sentence explanation of exactly why this choice is the correct answer to the question. You MUST explicitly reference the actual text of the correct choice from the prompt (for example, "Choice ${correctLabel}, ..."). Spend the bulk of your analytical effort here, using key numbers, conditions, or phrases from the question stem as evidence.`;
}

function buildMisconceptionInstruction(): string {
  return `[OPTIONAL SECTION — ONLY INCLUDE IF IT TRULY ADDS VALUE. IF SKIPPING, DO NOT PRINT THIS HEADING OR ANY TEXT FOR THIS SECTION.]
**Common Misconception:**\nONLY include this section if there is ONE highly tempting wrong answer that represents a frequent student error. Explicitly name the choice (for example, "Choice A is incorrect because..."). In 1–2 sentences, explain why it is a trap or how it misreads the concept. Do NOT analyze every incorrect choice and do NOT list multiple distractors here.`;
}

function buildCoachingInstruction(): string {
  return `**Coaching for students:**\n*Provide a 1–2 sentence meta-cognitive test-taking tip in italics. Tell the student how to spot the "trick" in similar questions, how to read this type of diagram, or what specific keywords to watch for next time. Do not introduce new content beyond what is needed for the test-taking tip.*`;
}

function buildExplanationInstruction(
  question: any,
  correctLabel: string,
): string {
  const concept = buildConceptHalfInstruction(question);
  const questionHalf = buildQuestionHalfInstruction(correctLabel);
  const misconception = buildMisconceptionInstruction();
  const coaching = buildCoachingInstruction();

  return `
${BASE_EXPLANATION_PREAMBLE}

${BASE_EXPLANATION_STYLE}

${concept}

${questionHalf}

${misconception}

${coaching}

${BASE_EXPLANATION_FOOTER}`;
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

  let promptText = `${BASE_EXPLANATION_PREAMBLE}\n\nGenerate a clear, structured explanation for this AP question.\n\n`;
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
  Object.entries(question.choices ?? {}).forEach(
    ([letter, blocks]: [string, any]) => {
      const choiceText = flattenChoiceText(blocks);
      choicesText += `${letter}. ${choiceText}\n`;
    },
  );
  const correctAnswerBlocks = question.choices?.[correctLabel];
  const correctAnswer = correctAnswerBlocks
    ? flattenChoiceText(correctAnswerBlocks)
    : "";
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

  const explanationInstruction = buildExplanationInstruction(
    question,
    correctLabel,
  );
  promptParts.push({
    text: explanationInstruction,
  });

  return { promptParts, correctLabel };
}

export async function buildReformatExplanationPromptParts(
  question: any,
): Promise<{
  promptParts: any[];
}> {
  const correctLabel = String.fromCharCode(65 + (question.answerIndex ?? 0));
  const promptParts: any[] = [];

  let promptText = `${BASE_EXPLANATION_PREAMBLE}\n\nYou are not generating a brand new explanation from scratch. Instead, you are rewriting and reformatting an existing explanation so that it strictly follows the target structure and style described below, without changing its factual meaning.\n\n`;

  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    const questionText = flattenChoiceText(question.prompt_blocks);
    promptText += `Question: ${questionText}\n`;
  }

  let choicesText = `\nAnswer Choices:\n`;
  const choicesEntries = Object.entries(question.choices ?? {});
  choicesEntries.forEach(([letter, blocks]: [string, any]) => {
    const choiceText = flattenChoiceText(blocks);
    choicesText += `${letter}. ${choiceText}\n`;
  });
  const correctAnswerBlocks = question.choices?.[correctLabel];
  const correctAnswer = correctAnswerBlocks
    ? flattenChoiceText(correctAnswerBlocks)
    : "";
  choicesText += `\nCorrect Answer: ${correctLabel}. ${correctAnswer}\n\n`;

  const existingExplanation = String(question.explanation ?? "").trim();

  promptParts.push({
    text: `${promptText}${choicesText}Current explanation (source of truth for content):\n${existingExplanation}\n\n${BASE_EXPLANATION_STYLE}\n\nYou must preserve the underlying meaning and which answer choice is correct. Do not introduce new factual claims that are not supported by the question or the existing explanation. Rewrite the explanation so it follows the exact same headings and structure used in the instructions (Concept, Why ${correctLabel} is correct, optional Common Misconception when justified, and Coaching for students) while improving clarity and scannability.\n\n${BASE_EXPLANATION_FOOTER}`,
  });

  return { promptParts };
}

export type RunExplanationGenerationParams = {
  questionIds: string[];
  model: string;
  ai: {
    models: { generateContent: (opts: any) => Promise<{ text?: string }> };
  };
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
}: RunExplanationGenerationParams): Promise<{
  updated: number;
  skipped: number;
  failed: number;
}> {
  const total = questionIds.length;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const verb = isRegenerate ? "Reformatting" : "Generating";
  const verbPast = isRegenerate ? "Reformatted" : "Generated";

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    if (onAborted()) {
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

      const question = doc.data();
      if (!question) continue;

      if (
        skipIfExplanationExists &&
        question?.explanation &&
        String(question.explanation).trim() !== ""
      ) {
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

      const existingExplanation = String(question.explanation ?? "").trim();

      if (isRegenerate && existingExplanation === "") {
        skipped++;
        sendEvent({
          type: "progress",
          current: i + 1,
          total,
          updated,
          skipped,
          failed,
          message: `Q${i + 1}/${total}: no existing explanation to reformat, skipped`,
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

      const { promptParts } = isRegenerate
        ? await buildReformatExplanationPromptParts(question)
        : await buildExplanationPromptParts(question);

      const result = await callWithRetry(
        () =>
          ai.models.generateContent({
            model,
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
            message: `Rate limit hit — waiting ${waitSec}s before retry ${attempt}/5...`,
          });
        },
      );

      let explanation = (result.text ?? "").trim();
      explanation = explanation.replace(/^Explanation:\s*/i, "").trim();

      await doc.ref.update({
        explanation,
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
        message: `${verbPast} ${updated}/${total - skipped} explanations`,
      });
    } catch (error: any) {
      failed++;
      const isQuota = isQuotaError(error);
      console.error(
        `✗ Failed to ${isRegenerate ? "reformat" : "generate"} explanation for ${questionId}:`,
        isQuota ? "Quota exhausted after retries" : error.message,
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
                    : (error?.message || "Explanation generation failed").slice(
                        0,
                        500,
                      ),
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
