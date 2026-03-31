/**
 * 2026 Digital/Hybrid: 4-option (A-D) vs 5-option (A-E) MCQ display and scoring.
 * For 4-option subjects, legacy A-E questions with correct=E are shown as A-D
 * by swapping E's content into the D slot and treating D as correct.
 */

type ChoiceLabel = "A" | "B" | "C" | "D" | "E";
type Block = { type: "text"; value: string } | { type: "image"; url: string };

export interface DisplayChoicesResult {
  /** Labels to show (A-D for 4-option, or A-E with E filtered if empty) */
  choiceLabels: ChoiceLabel[];
  /** For each label, the blocks to render (for 4-option + correct=E, D shows E's content) */
  getChoiceBlocks: (label: ChoiceLabel) => Block[] | undefined;
  /** Correct answer label for display/scoring (A-D for 4-option when stored correct was E) */
  displayCorrectLabel: string;
  /** When submitting, map user's display selection back to stored letter if we did E→D swap */
  storedAnswerForSubmit: (displaySelection: string) => string;
}

function isEmptyChoice(blocks: Block[] | undefined): boolean {
  if (!blocks || blocks.length === 0) return true;
  if (blocks.length === 1 && blocks[0].type === "text" && (!blocks[0].value || blocks[0].value.trim() === ""))
    return true;
  return false;
}

/**
 * Get choice labels and correct answer for display. For 4-option subjects, if the
 * stored correct answer is E, we show only A-D and show E's content in the D slot (D is correct).
 */
export function getDisplayChoicesAndCorrect(
  question: { choices: Record<ChoiceLabel, Block[]>; answerIndex: number },
  mcqOptionCount: number | undefined
): DisplayChoicesResult {
  const optionCount = mcqOptionCount ?? 5;
  const choices = question.choices;
  const answerIndex = question.answerIndex;
  const storedCorrectLabel = String.fromCharCode(65 + answerIndex) as ChoiceLabel;
  const isFourOption = optionCount === 4;
  const correctIsE = answerIndex === 4;

  if (isFourOption && correctIsE) {
    // Show only A, B, C, D. D slot shows E's content; D is the display correct.
    const choiceLabels: ChoiceLabel[] = ["A", "B", "C", "D"];
    const getChoiceBlocks = (label: ChoiceLabel): Block[] | undefined => {
      if (label === "D") return choices["E"] ?? [];
      return choices[label] ?? [];
    };
    return {
      choiceLabels,
      getChoiceBlocks,
      displayCorrectLabel: "D",
      storedAnswerForSubmit: (displaySelection: string) =>
        displaySelection === "D" ? "E" : displaySelection,
    };
  }

  if (isFourOption && !correctIsE) {
    // 4-option, correct is A-D: show only A-D, no swap.
    const choiceLabels: ChoiceLabel[] = ["A", "B", "C", "D"];
    const getChoiceBlocks = (label: ChoiceLabel): Block[] | undefined => choices[label] ?? [];
    return {
      choiceLabels,
      getChoiceBlocks,
      displayCorrectLabel: storedCorrectLabel,
      storedAnswerForSubmit: (s) => s,
    };
  }

  // 5-option: show A–E, optionally hide E if empty
  const allFive: ChoiceLabel[] = ["A", "B", "C", "D", "E"];
  const choiceLabels = allFive.filter((label) => {
    if (label !== "E") return true;
    if (isEmptyChoice(choices["E"])) return false;
    return true;
  });
  const getChoiceBlocks = (label: ChoiceLabel): Block[] | undefined => choices[label] ?? [];
  return {
    choiceLabels,
    getChoiceBlocks,
    displayCorrectLabel: storedCorrectLabel,
    storedAnswerForSubmit: (s) => s,
  };
}

/** Get the display correct label only (for scoring when you don't need choice blocks). */
export function getDisplayCorrectLabel(
  question: { answerIndex: number },
  mcqOptionCount: number | undefined
): string {
  const optionCount = mcqOptionCount ?? 5;
  const isFourOption = optionCount === 4;
  const correctIsE = question.answerIndex === 4;
  if (isFourOption && correctIsE) return "D";
  return String.fromCharCode(65 + question.answerIndex);
}

/** Map user's displayed selection to stored answer for API (for 4-option E→D swap). */
export function getStoredAnswerForSubmit(
  displaySelection: string,
  question: { answerIndex: number },
  mcqOptionCount: number | undefined
): string {
  const optionCount = mcqOptionCount ?? 5;
  if (optionCount === 4 && question.answerIndex === 4 && displaySelection === "D") return "E";
  return displaySelection;
}

/** Heuristic: content looks like LaTeX (e.g. \int, \frac, \sqrt). */
function looksLikeLatex(content: string): boolean {
  const t = content.trim();
  return t.startsWith("\\") || /\\[a-zA-Z]+|\\[{}^_]|\^{|_\{/.test(content);
}

/** Convert backtick-wrapped LaTeX to $...$ so remark-math can render it. */
function normalizeBacktickLatex(text: string): string {
  return text.replace(/`([^`]+)`/g, (_, inner) =>
    looksLikeLatex(inner) ? `$${inner}$` : `\`${inner}\``
  );
}

/**
 * Remove or fix math that can crash remark-math/rehype-katex (e.g. "Cannot set
 * properties of undefined (setting 'value')" from empty or malformed delimiters).
 */
function sanitizeMathDelimiters(text: string): string {
  return (
    text
      // Empty display math $$...$$ with nothing or only whitespace
      .replace(/\$\$\s*\$\$/g, " ")
      // Empty inline math $ $ with nothing or only whitespace
      .replace(/\$\s*\$/g, " ")
  );
}

/**
 * When we display E as D (4-option, stored correct=E), rewrite the explanation text
 * so that references to the correct answer "E" are shown as "D" for consistency.
 * Also normalizes backtick-wrapped LaTeX to $...$ for proper math rendering.
 */
export function getDisplayExplanation(
  explanation: string | undefined | null,
  question: { answerIndex: number },
  mcqOptionCount: number | undefined
): string {
  if (explanation == null || typeof explanation !== "string") return explanation ?? "";
  const optionCount = mcqOptionCount ?? 5;

  let text = explanation;
  if (optionCount === 4 && question.answerIndex === 4) {
    // Phrases where E is the correct answer (case-insensitive, preserve original case of non-E part)
    const replacements: [RegExp, string][] = [
      [/\b(the\s+)?correct\s+answer\s+is\s+E\b/gi, "$1correct answer is D"],
      [/\banswer\s+is\s+E\b/gi, "answer is D"],
      [/\bAnswer:\s*E\b/gi, "Answer: D"],
      [/\boption\s+E\s+is\s+correct\b/gi, "option D is correct"],
      [/\bchoice\s+E\b/gi, "choice D"],
      [/\bOption\s+E\b/g, "Option D"],
      [/\bE\s+is\s+correct\b/gi, "D is correct"],
      [/\bE\s+is\s+the\s+correct\b/gi, "D is the correct"],
      [/\bis\s+E\./gi, "is D."],
      [/\bis\s+E\s/gi, "is D "],
      [/\bE\s+is\s+the\s+right\b/gi, "D is the right"],
      [/\bE\)/g, "D)"],
      [/\bE\./g, "D."],
    ];
    for (const [regex, replacement] of replacements) {
      text = text.replace(regex, replacement);
    }
  }
  return sanitizeMathDelimiters(normalizeBacktickLatex(text));
}
