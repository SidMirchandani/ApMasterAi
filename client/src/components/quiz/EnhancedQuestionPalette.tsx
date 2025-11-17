
import { XCircle, MapPin, Flag, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedQuestionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  questions: any[];
  currentQuestion: number;
  userAnswers: { [key: number]: string };
  flaggedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
  onGoToReview?: () => void;
}

export function EnhancedQuestionPalette({
  isOpen,
  onClose,
  questions,
  currentQuestion,
  userAnswers,
  flaggedQuestions,
  onQuestionSelect,
  onGoToReview,
}: EnhancedQuestionPaletteProps) {
  if (!isOpen) return null;

  const getQuestionState = (index: number) => {
    if (index === currentQuestion) return "current";
    if (flaggedQuestions.has(index)) return "flagged";
    if (userAnswers[index]) return "answered";
    return "unanswered";
  };

  const getQuestionClass = (index: number) => {
    const state = getQuestionState(index);
    const baseClass = "w-12 h-12 rounded border-2 text-center font-semibold flex items-center justify-center transition-all relative";
    
    switch (state) {
      case "current":
        return `${baseClass} bg-gray-900 text-white border-gray-900`;
      case "flagged":
        return `${baseClass} bg-white text-gray-900 border-red-500`;
      case "answered":
        return `${baseClass} bg-blue-600 text-white border-blue-600`;
      default:
        return `${baseClass} bg-white text-gray-900 border-gray-300 border-dashed`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">AP® Biology Practice Exam</h3>
          <button onClick={onClose}>
            <XCircle className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 border-gray-300 border-dashed"></div>
            <span>Unanswered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-50 border-2 border-red-500 flex items-center justify-center">
              <Flag className="h-3 w-3 text-red-500" />
            </div>
            <span>For Review</span>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-3 mb-6">
          {questions.map((_, i) => {
            const state = getQuestionState(i);
            return (
              <button
                key={i}
                onClick={() => {
                  onQuestionSelect(i);
                  onClose();
                }}
                className={getQuestionClass(i)}
              >
                {i + 1}
                {state === "flagged" && (
                  <Flag className="h-3 w-3 text-red-500 absolute -top-1 -right-1" fill="currentColor" />
                )}
                {state === "current" && (
                  <MapPin className="h-3 w-3 absolute -top-1 -right-1" fill="white" />
                )}
              </button>
            );
          })}
        </div>

        {onGoToReview && (
          <div className="flex justify-center">
            <Button onClick={onGoToReview} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              Go to Review Page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
