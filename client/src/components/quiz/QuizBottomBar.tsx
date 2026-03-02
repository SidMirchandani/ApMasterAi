import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";

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
            <span>
              Question {currentQuestion} of {totalQuestions}
            </span>
            <ChevronUp className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            {onReportError && (
              <Button
                variant="outline"
                onClick={onReportError}
                className="text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-sm font-medium"
              >
                Report Error
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="flex items-center gap-2 rounded-xl border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{currentQuestion === 0 ? "Back" : "Previous"}</span>
                <span className="sm:hidden">{currentQuestion === 0 ? "Back" : "Prev"}</span>
              </Button>
              {onReview ? (
                <Button
                  onClick={onReview}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-2 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-2 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
