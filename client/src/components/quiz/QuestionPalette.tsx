
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  questions: any[];
  userAnswers: { [key: number]: string };
  flaggedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
}

export function QuestionPalette({
  isOpen,
  onClose,
  questions,
  userAnswers,
  flaggedQuestions,
  onQuestionSelect,
}: QuestionPaletteProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl md:rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Question Palette</h3>
          <button onClick={onClose}>
            <XCircle className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
          {questions.map((_, i) => {
            const isDone = !!userAnswers[i];
            const flagged = flaggedQuestions.has(i);

            return (
              <button
                key={i}
                onClick={() => onQuestionSelect(i)}
                className={`p-3 rounded border text-center text-sm ${
                  flagged
                    ? "border-red-400 bg-red-50"
                    : isDone
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-right">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
