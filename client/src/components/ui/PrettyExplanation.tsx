"use client";

import {
  parseExplanationSections,
  getWhyOthersWrongBullets,
} from "@/lib/parseExplanation";
import { ExplanationMarkdown } from "@/components/ui/ExplanationMarkdown";

const defaultClassName =
  "text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none";

interface PrettyExplanationProps {
  children: string;
  className?: string;
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
}: PrettyExplanationProps) {
  const raw = typeof children === "string" ? children : "";
  const parsed = parseExplanationSections(raw);

  if (!parsed) {
    return (
      <ExplanationMarkdown className={className}>
        {raw}
      </ExplanationMarkdown>
    );
  }

  const { concept, whyCorrect, correctLetter, whyOthersWrong } = parsed;
  const bullets =
    whyOthersWrong !== null ? getWhyOthersWrongBullets(whyOthersWrong) : [];

  return (
    <div className={className}>
      {concept && (
        <div className="mb-3">
          <p className="font-semibold text-inherit mb-1">Concept:</p>
          <ExplanationMarkdown className="text-inherit [&_.prose]:mb-0">
            {concept}
          </ExplanationMarkdown>
        </div>
      )}

      {whyCorrect && (
        <div className="mb-3">
          <p className="font-semibold text-inherit mb-1">
            Why {correctLetter ?? "the correct choice"} is correct:
          </p>
          <ExplanationMarkdown className="text-inherit [&_.prose]:mb-0">
            {whyCorrect}
          </ExplanationMarkdown>
        </div>
      )}

      {whyOthersWrong !== null && (
        <div>
          <p className="font-semibold text-inherit mb-1">
            Why other choices are wrong:
          </p>
          <ExplanationMarkdown className="text-inherit [&_ul]:my-1 [&_li]:my-0.5">
            {bullets.map((b) => `- ${b}`).join("\n")}
          </ExplanationMarkdown>
        </div>
      )}
    </div>
  );
}
