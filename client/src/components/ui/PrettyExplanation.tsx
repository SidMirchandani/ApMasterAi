"use client";

import {
  parseExplanationSections,
  getWhyOthersWrongBullets,
} from "@/lib/parseExplanation";
import { ExplanationMarkdown } from "@/components/ui/ExplanationMarkdown";

/**
 * Single typography scale for quiz explanations (~12.4px): between text-xs and text-sm.
 * Use everywhere the explanation blurb appears (practice, review, bookmarks, results).
 */
export const QUIZ_EXPLANATION_CLASSNAME =
  "max-w-none text-[0.775rem] leading-relaxed text-slate-800 dark:text-slate-200 prose prose-sm dark:prose-invert " +
  "prose-p:my-1.5 prose-p:text-[0.775rem] prose-p:leading-relaxed " +
  "prose-li:text-[0.775rem] prose-li:leading-relaxed " +
  "prose-headings:text-[0.775rem] prose-headings:font-semibold prose-headings:my-1 " +
  "prose-ul:my-1 prose-ol:my-1";

/** Two-column layout: question ~65%, explanation ~35% (matches fr split below). */
export const QUIZ_QUESTION_EXPL_GRID_CLASS =
  "grid min-w-0 gap-4 md:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] md:gap-6";

const defaultClassName = `${QUIZ_EXPLANATION_CLASSNAME} text-gray-700 dark:text-gray-300`;

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
