"use client";

import {
  parseExplanationSections,
  getWhyOthersWrongBullets,
} from "@/lib/parseExplanation";
import { ExplanationMarkdown } from "@/components/ui/ExplanationMarkdown";

const defaultClassName =
  "text-xs text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none";

interface PrettyExplanationProps {
  children: string;
  className?: string;
  /** Tighter section gaps and list spacing (quiz review, etc.). */
  compact?: boolean;
}

/**
 * Renders explanation in a consistent structure:
 * 1. Concept (if present) — bold heading + paragraph
 * 2. Why [X] is correct — bold heading + paragraph
 * 3. Why other choices are wrong — bold heading + bulleted list
 * Falls back to raw ExplanationMarkdown if the text doesn't match this structure.
 */
export function PrettyExplanation({
  children,
  className = defaultClassName,
  compact = false,
}: PrettyExplanationProps) {
  const raw = typeof children === "string" ? children : "";
  const parsed = parseExplanationSections(raw);
  const blockGap = compact ? "mb-1.5" : "mb-3";
  const labelGap = compact ? "mb-0.5" : "mb-1";
  const listTight = compact
    ? "[&_ul]:!my-0.5 [&_li]:!my-0 [&_li]:!leading-snug"
    : "[&_ul]:my-1 [&_li]:my-0.5";

  if (!parsed) {
    return (
      <ExplanationMarkdown
        className={`${className} ${compact ? "leading-snug [&_.prose]:leading-snug [&_.prose_p]:!my-1" : ""}`}
      >
        {raw}
      </ExplanationMarkdown>
    );
  }

  const { concept, whyCorrect, correctLetter, whyOthersWrong } = parsed;
  const bullets =
    whyOthersWrong !== null ? getWhyOthersWrongBullets(whyOthersWrong) : [];

  return (
    <div
      className={`${className} ${compact ? "leading-snug [&_.prose]:leading-snug" : ""}`}
    >
      {concept && (
        <div className={blockGap}>
          <p className={`font-semibold text-inherit ${labelGap}`}>Concept:</p>
          <ExplanationMarkdown className={`text-inherit [&_.prose]:mb-0 ${compact ? "[&_.prose_p]:!my-0.5" : ""}`}>
            {concept}
          </ExplanationMarkdown>
        </div>
      )}

      {whyCorrect && (
        <div className={blockGap}>
          <p className={`font-semibold text-inherit ${labelGap}`}>
            Why {correctLetter ?? "the correct choice"} is correct:
          </p>
          <ExplanationMarkdown className={`text-inherit [&_.prose]:mb-0 ${compact ? "[&_.prose_p]:!my-0.5" : ""}`}>
            {whyCorrect}
          </ExplanationMarkdown>
        </div>
      )}

      {whyOthersWrong !== null && (
        <div>
          <p className={`font-semibold text-inherit ${labelGap}`}>
            Why other choices are wrong:
          </p>
          <ExplanationMarkdown className={`text-inherit ${listTight}`}>
            {bullets.map((b) => `- ${b}`).join("\n")}
          </ExplanationMarkdown>
        </div>
      )}
    </div>
  );
}
