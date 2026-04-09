"use client";

import { ReactNode } from "react";

interface ExplanationPanelProps {
  /** When false, panel is hidden unless showEmptyHint is set. */
  hasAnswered: boolean;
  /** Correctness status used for subtle success/error tint after submit. */
  isCorrect?: boolean;
  /** Rendered after the user answers (feedback + optional explanation body). */
  children?: ReactNode;
  className?: string;
  /**
   * When true and the user has not answered yet, show a subtle hint instead of nothing.
   * Prefer false for practice flows so no “explanation” chrome appears early.
   */
  showEmptyHint?: boolean;
}

/**
 * Post-answer feedback block: top border + free-flowing content (no boxed panel, no “Explanation” title).
 * Callers own copy (Correct / Incorrect) and optional PrettyExplanation.
 */
export function ExplanationPanel({
  hasAnswered,
  isCorrect,
  children,
  className = "",
  showEmptyHint = true,
}: ExplanationPanelProps) {
  const basePanelClass =
    "rounded-xl border px-4 py-3 text-sm leading-relaxed";

  if (!hasAnswered) {
    if (!showEmptyHint) return null;
    return (
      <div
        className={`${basePanelClass} border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 ${className}`}
      >
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Explanation
        </p>
        <p className="mt-2 text-sm">
          An explanation will appear here once you submit your answer.
        </p>
      </div>
    );
  }

  const answeredTintClass = isCorrect
    ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700/70 dark:bg-emerald-950/30 dark:text-emerald-100"
    : "border-red-200 bg-red-50 text-red-950 dark:border-red-700/70 dark:bg-red-950/30 dark:text-red-100";

  return (
    <div className={`${basePanelClass} ${answeredTintClass} ${className}`}>
      <p className="text-sm font-semibold">Explanation</p>
      <div className="space-y-3 text-sm text-slate-800 dark:text-slate-200 [&_.prose]:max-w-none">
        {children}
      </div>
    </div>
  );
}
