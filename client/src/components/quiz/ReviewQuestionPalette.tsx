import { XCircle, CheckCircle, AlertCircle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewQuestionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  questions: any[];
  currentQuestion: number;
  userAnswers: { [key: number]: string };
  correctAnswers: { [key: number]: string };
  onQuestionSelect: (index: number) => void;
  showOriginalNumbers?: boolean;
  originalIndices?: number[];
}

export function ReviewQuestionPalette({
  isOpen,
  onClose,
  questions,
  currentQuestion,
  userAnswers,
  correctAnswers,
  onQuestionSelect,
  showOriginalNumbers = false,
  originalIndices = [],
}: ReviewQuestionPaletteProps) {
  if (!isOpen) return null;

  const getQuestionState = (index: number) => {
    const userAnswer = userAnswers[index];
    const correctAnswer = correctAnswers[index];

    if (!userAnswer) return "skipped";
    if (userAnswer === correctAnswer) return "correct";
    return "incorrect";
  };

  const getQuestionClass = (index: number) => {
    const state = getQuestionState(index);
    const isCurrent = index === currentQuestion;
    const baseClass =
      "w-12 h-12 rounded border-2 text-center font-semibold flex items-center justify-center transition-all relative";

    if (isCurrent) {
      // Current question - show with darker border
      if (state === "correct") {
        return `${baseClass} bg-green-500 text-white border-green-700`;
      } else if (state === "incorrect") {
        return `${baseClass} bg-red-500 text-white border-red-700`;
      } else {
        return `${baseClass} bg-white text-gray-900 border-red-500`;
      }
    }

    // Non-current questions
    switch (state) {
      case "correct":
        return `${baseClass} bg-green-100 text-green-800 border-green-400`;
      case "incorrect":
        return `${baseClass} bg-red-100 text-red-800 border-red-400`;
      case "skipped":
        return `${baseClass} bg-white text-gray-900 border-red-400 border-dashed`;
      default:
        return `${baseClass} bg-white text-gray-900 border-gray-300`;
    }
  };

  const getDisplayNumber = (index: number) => {
    if (showOriginalNumbers && originalIndices.length > 0) {
      return originalIndices[index] + 1;
    }
    return index + 1;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-4">
          <button onClick={onClose}>
            <XCircle className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-6 mb-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-green-100 border-2 border-green-400 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-100 border-2 border-red-400 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <span>Incorrect</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 border-red-400 border-dashed bg-white"></div>
            <span>Skipped</span>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-3 mb-6">
          {questions.map((_, i) => {
            const state = getQuestionState(i);
            const displayNum = getDisplayNumber(i);

            return (
              <button
                key={i}
                onClick={() => {
                  onQuestionSelect(i);
                  onClose();
                }}
                className={getQuestionClass(i)}
              >
                {displayNum}
                {state === "correct" && (
                  <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 fill-green-600 text-white" />
                )}
                {state === "incorrect" && (
                  <XCircle className="h-3 w-3 absolute -top-1 -right-1 fill-red-600 text-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
