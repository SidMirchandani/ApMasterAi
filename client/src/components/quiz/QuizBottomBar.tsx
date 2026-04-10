import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronLeft, ChevronRight, X, Zap } from "lucide-react";

interface QuizBottomBarProps {
  currentQuestion: number;
  totalQuestions: number;
  onOpenPalette?: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onReview?: () => void;
  onAdminAutoAnswer?: () => void;
  /** AP Classroom–inspired styling (navy palette control, light bar). */
  barVariant?: "default" | "apclassroom";
  /** When true, hide question palette and show only Previous, Next, and Exit */
  reviewOnly?: boolean;
  /** Exit handler (e.g. back to results); shown when provided (e.g. review-only mode or unit review) */
  onExit?: () => void;
  /** Label for Exit button when reviewOnly (default: "Exit") */
  exitLabel?: string;
  /** When true, hide the Exit button (e.g. when a top "Close Review" is shown instead) */
  hideExitButton?: boolean;
}

export function QuizBottomBar({
  currentQuestion,
  totalQuestions,
  onOpenPalette,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onReview,
  onAdminAutoAnswer,
  reviewOnly = false,
  onExit,
  exitLabel = "Exit",
  hideExitButton = false,
  barVariant = "default",
}: QuizBottomBarProps) {
  const showPalette = !reviewOnly && onOpenPalette;
  const showExit = !!onExit && !hideExitButton;
  const isApClass = barVariant === "apclassroom";

  const islandClass = isApClass
    ? "rounded-2xl border border-[#d4dbe3] bg-[#f7f8fa]/95 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-[#1a2b42]/95"
    : "rounded-2xl border border-slate-200/90 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/40";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-50 px-2 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:px-6">
      <div
        className={`pointer-events-auto mx-auto flex min-w-0 max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-2 py-2 sm:flex-nowrap sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5 ${islandClass}`}
      >
        <div className="flex min-w-0 flex-[1_1_auto] items-center gap-2 sm:flex-1">
          <span
            className={
              isApClass
                ? "truncate text-xs font-semibold tracking-wide text-[#1a2b42] dark:text-white/90"
                : "truncate text-sm font-display font-bold text-blue-600 dark:text-blue-400"
            }
          >
            {isApClass ? "Assessment" : "APMaster"}
          </span>
          {onAdminAutoAnswer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAdminAutoAnswer}
              className="shrink-0 border-amber-300 text-xs text-amber-600 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
              title="Admin: Auto-answer with target grade %"
            >
              <Zap className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auto</span>
            </Button>
          )}
        </div>

        {showPalette ? (
          <button
            type="button"
            onClick={onOpenPalette}
            className={
              isApClass
                ? "flex shrink-0 items-center gap-2 rounded-lg bg-[#1a2b42] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#243652] sm:px-4"
                : "flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 sm:px-4"
            }
          >
            <span className="hidden sm:inline">
              Question {currentQuestion} of {totalQuestions}
            </span>
            <span className="sm:hidden">
              {currentQuestion} of {totalQuestions}
            </span>
            <ChevronUp className="h-4 w-4 shrink-0" />
          </button>
        ) : (
          <span
            className={
              isApClass
                ? "shrink-0 text-sm font-medium text-[#3d4f63] dark:text-white/80"
                : "shrink-0 text-sm font-medium text-slate-600 dark:text-slate-400"
            }
          >
            Question {currentQuestion} of {totalQuestions}
          </span>
        )}

        <div className="flex min-w-0 flex-[1_1_auto] items-center justify-end gap-1.5 sm:flex-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className={
              isApClass
                ? "h-9 min-w-[2.25rem] shrink-0 gap-1 rounded-lg border-[#c5ced8] bg-white px-2 text-[#1a2b42] hover:bg-[#eef1f5] sm:min-w-0 sm:px-3"
                : "h-9 min-w-[2.25rem] shrink-0 gap-1 rounded-xl border-slate-200 transition-all duration-150 ease-out hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-600 dark:hover:bg-blue-500/10 sm:min-w-0 sm:px-3"
            }
            title={currentQuestion === 0 ? "Back" : "Previous"}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{currentQuestion === 0 ? "Back" : "Previous"}</span>
          </Button>
          {onReview ? (
            <Button
              size="sm"
              onClick={onReview}
              className={
                isApClass
                  ? "h-9 shrink-0 gap-1 rounded-lg bg-[#0073cf] px-2 text-white shadow-sm hover:bg-[#0062b0] sm:px-3"
                  : "h-9 shrink-0 gap-1 rounded-xl bg-blue-600 px-2 text-white shadow-sm transition-all duration-150 ease-out hover:bg-blue-700 hover:shadow-md active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-600 sm:px-3"
              }
              title="Next"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onNext}
              disabled={!canGoNext}
              className={
                isApClass
                  ? "h-9 shrink-0 gap-1 rounded-lg bg-[#0073cf] px-2 text-white shadow-sm hover:bg-[#0062b0] disabled:opacity-50 sm:px-3"
                  : "h-9 shrink-0 gap-1 rounded-xl bg-blue-600 px-2 text-white shadow-sm transition-all duration-150 ease-out hover:bg-blue-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 sm:px-3"
              }
              title="Next"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          )}
          {showExit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="h-9 min-w-[2.25rem] shrink-0 gap-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10 sm:min-w-0 sm:px-3"
              title={exitLabel}
            >
              <X className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{exitLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
