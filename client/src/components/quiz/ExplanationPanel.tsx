"use client";

import { ReactNode } from "react";

interface ExplanationPanelProps {
  /** Whether the user has answered; if false, show empty grey placeholder */
  hasAnswered: boolean;
  /** When hasAnswered, whether the answer was correct (green vs red) */
  isCorrect?: boolean;
  /** Rendered explanation content when hasAnswered */
  children?: ReactNode;
  className?: string;
}

/**
 * Side panel for quiz/question UIs: grey "Explanation" box (empty until answered),
 * then fills with green (correct) or red (incorrect) explanation.
 * Used in a flex row on desktop (30–40% width) and below question on narrow screens.
 */
export function ExplanationPanel({
  hasAnswered,
  isCorrect = false,
  children,
  className = "",
}: ExplanationPanelProps) {
  const base =
    "rounded-lg border-2 flex flex-col min-h-[100px] md:min-h-0 " + className;

  if (!hasAnswered) {
    return (
      <div
        className={`${base} bg-gray-100 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 flex-1 flex flex-col items-start justify-start p-3`}
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
          Explanation
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
          An AI-generated explanation will appear here once you answer.
        </span>
      </div>
    );
  }

  const correctClass =
    "ring-2 ring-green-500 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-500/10";
  const incorrectClass =
    "ring-2 ring-red-500 border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-500/10";

  return (
    <div
      className={`${base} ${isCorrect ? correctClass : incorrectClass} flex-1 p-3 overflow-auto`}
    >
      <span
        className={`text-xs font-semibold block mb-1.5 ${
          isCorrect
            ? "text-green-800 dark:text-green-300"
            : "text-red-800 dark:text-red-300"
        }`}
      >
        {isCorrect ? "Correct — Explanation" : "Incorrect — Explanation"}
      </span>
      <div className="text-xs text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
}
