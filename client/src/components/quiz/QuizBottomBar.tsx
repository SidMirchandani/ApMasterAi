import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronLeft, ChevronRight, X, AlertTriangle, Zap } from "lucide-react";

interface QuizBottomBarProps {
  currentQuestion: number;
  totalQuestions: number;
  onOpenPalette?: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReportError?: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  onSubmit?: () => void;
  onReview?: () => void;
  onSaveAndExit?: () => void;
  onAdminAutoAnswer?: () => void;
  subjectId?: string;
  /** When true, hide question palette and show only Previous, Next, and Exit */
  reviewOnly?: boolean;
  /** Exit handler (e.g. back to results); shown when provided (e.g. review-only mode or unit review) */
  onExit?: () => void;
  /** Label for Exit button when reviewOnly (default: "Exit") */
  exitLabel?: string;
}

export function QuizBottomBar({
  currentQuestion,
  totalQuestions,
  onOpenPalette,
  onPrevious,
  onNext,
  onReportError,
  canGoPrevious,
  canGoNext,
  isLastQuestion,
  onSubmit,
  onReview,
  onSaveAndExit,
  onAdminAutoAnswer,
  subjectId,
  reviewOnly = false,
  onExit,
  exitLabel = "Exit",
}: QuizBottomBarProps) {
  const showPalette = !reviewOnly && onOpenPalette;
  const showExit = !!onExit;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-bold text-blue-600 dark:text-blue-400">
              APMaster
            </span>
            {onAdminAutoAnswer && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAdminAutoAnswer}
                className="text-amber-600 border-amber-300 dark:border-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs"
                title="Admin: Auto-answer with target grade %"
              >
                <Zap className="h-3.5 w-3.5 mr-1" />
                Auto-answer
              </Button>
            )}
          </div>

          {showPalette ? (
            <button
              onClick={onOpenPalette}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
            >
              <span className="hidden sm:inline">
                Question {currentQuestion} of {totalQuestions}
              </span>
              <span className="sm:hidden">
                {currentQuestion} of {totalQuestions}
              </span>
              <ChevronUp className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Question {currentQuestion} of {totalQuestions}
            </span>
          )}

          <div className="flex items-center gap-3">
            {!reviewOnly && onReportError && (
              <Button
                variant="outline"
                onClick={onReportError}
                className="text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-sm font-medium"
                title="Report Error"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0 sm:mr-1" />
                <span className="hidden sm:inline">Report Error</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 min-w-[2.25rem] sm:min-w-0 transition-all duration-150 ease-out"
                title={currentQuestion === 0 ? "Back" : "Previous"}
              >
                <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{currentQuestion === 0 ? "Back" : "Previous"}</span>
              </Button>
              {onReview ? (
                <Button
                  onClick={onReview}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white flex items-center gap-2 rounded-xl shadow-sm hover:shadow-md min-w-[2.25rem] sm:min-w-0 transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]"
                  title="Next"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white flex items-center gap-2 rounded-xl shadow-sm hover:shadow-md min-w-[2.25rem] sm:min-w-0 transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]"
                  title="Next"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              )}
              {showExit && (
                <Button
                  variant="outline"
                  onClick={onExit}
                  className="flex items-center gap-2 rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 min-w-[2.25rem] sm:min-w-0"
                  title={exitLabel}
                >
                  <X className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{exitLabel}</span>
                </Button>
              )}
              {onSaveAndExit && !reviewOnly && (
                <Button
                  variant="outline"
                  onClick={onSaveAndExit}
                  className="flex items-center gap-2 rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 min-w-[2.25rem] sm:min-w-0"
                  title="Save & Exit"
                >
                  <X className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Save & Exit</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
