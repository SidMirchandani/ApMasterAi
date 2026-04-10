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
  /** Tighter padding and text (e.g. quiz results review column). */
  compact?: boolean;
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
  compact = false,
}: ExplanationPanelProps) {
  const basePanelClass = compact
    ? "min-w-0 max-w-full rounded-xl border px-3 py-2 text-xs leading-snug"
    : "min-w-0 max-w-full rounded-xl border px-4 py-3 text-sm leading-relaxed";

  if (!hasAnswered) {
    if (!showEmptyHint) return null;
    return (
      <div
        className={`${basePanelClass} border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 ${className}`}
      >
        <p
          className={
            compact
              ? "text-xs font-semibold text-slate-800 dark:text-slate-100"
              : "text-sm font-semibold text-slate-800 dark:text-slate-100"
          }
        >
          Explanation
        </p>
        <p className={compact ? "mt-1.5 text-xs" : "mt-2 text-sm"}>
          An explanation will appear here once you submit your answer.
        </p>
      </div>
    );
  }

  const answeredTintClass = isCorrect
    ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700/70 dark:bg-emerald-950/30 dark:text-emerald-100"
    : "border-red-200 bg-red-50 text-red-950 dark:border-red-700/70 dark:bg-red-950/30 dark:text-red-100";

  const bodyClass = compact
    ? "min-w-0 space-y-2 overflow-x-auto text-xs text-slate-800 dark:text-slate-200 [&_.prose]:max-w-none [&_.prose]:text-xs [&_.prose]:leading-snug [&_.prose_p]:my-1.5 [&_.prose_li]:my-0.5 [&_.prose-pre]:max-w-full [&_.prose-pre]:overflow-x-auto"
    : "min-w-0 space-y-3 overflow-x-auto text-sm text-slate-800 dark:text-slate-200 [&_.prose]:max-w-none [&_.prose-pre]:max-w-full [&_.prose-pre]:overflow-x-auto";

  return (
    <div className={`${basePanelClass} ${answeredTintClass} ${className}`}>
      <p className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>Explanation</p>
      <div className={bodyClass}>{children}</div>
    </div>
  );
}
