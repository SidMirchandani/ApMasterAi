import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronLeft, ChevronRight, X, AlertTriangle } from "lucide-react";

interface QuizBottomBarProps {
  currentQuestion: number;
  totalQuestions: number;
  onOpenPalette: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReportError?: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  onSubmit?: () => void;
  onReview?: () => void;
  onSaveAndExit?: () => void;
  subjectId?: string;
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
  subjectId,
}: QuizBottomBarProps) {
  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-bold text-emerald-600 dark:text-emerald-400">
              APMaster
            </span>
          </div>

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

          <div className="flex items-center gap-3">
            {onReportError && (
              <Button
                variant="outline"
                onClick={onReportError}
                className="text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-sm font-medium"
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
                className="flex items-center gap-2 rounded-xl border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 min-w-[2.25rem] sm:min-w-0"
                title={currentQuestion === 0 ? "Back" : "Previous"}
              >
                <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{currentQuestion === 0 ? "Back" : "Previous"}</span>
              </Button>
              {onReview ? (
                <Button
                  onClick={onReview}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-2 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)] min-w-[2.25rem] sm:min-w-0"
                  title="Next"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-2 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)] min-w-[2.25rem] sm:min-w-0"
                  title="Next"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              )}
              {onSaveAndExit && (
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
