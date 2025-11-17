
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

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
}: QuizBottomBarProps) {
  return (
    <div className="border-t border-gray-200 bg-white sticky bottom-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">APMaster</span>
          </div>

          <button
            onClick={onOpenPalette}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition"
          >
            <span className="font-medium">
              Question {currentQuestion} of {totalQuestions}
            </span>
            <ChevronUp className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            {onReportError && (
              <Button variant="outline" onClick={onReportError} className="text-red-600 border-red-600">
                Report Error
              </Button>
            )}
            <Button variant="outline" onClick={onPrevious} disabled={!canGoPrevious}>
              Back
            </Button>
            {isLastQuestion && onReview ? (
              <Button onClick={onReview} className="bg-blue-600 hover:bg-blue-700">
                Next
              </Button>
            ) : (
              <Button onClick={onNext} disabled={!canGoNext} className="bg-blue-600 hover:bg-blue-700">
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
