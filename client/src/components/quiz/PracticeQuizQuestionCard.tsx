
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BlockRenderer } from "./BlockRenderer";

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

interface Question {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  prompt?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

interface PracticeQuizQuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answer: string) => void;
  isAnswerSubmitted?: boolean;
}

export function PracticeQuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  isAnswerSubmitted = false,
}: PracticeQuizQuestionCardProps) {
  if (!question) {
    return null;
  }

  const allChoices = Object.keys(question.choices) as Array<"A" | "B" | "C" | "D" | "E">;

  // Filter out choice E if it's blank
  const choices = allChoices.filter((label) => {
    if (label !== "E") return true;

    const choiceBlocks = question.choices[label];
    if (!choiceBlocks || choiceBlocks.length === 0) return false;

    // Check if it's only empty text
    if (choiceBlocks.length === 1 &&
        choiceBlocks[0].type === "text" &&
        (!choiceBlocks[0].value || choiceBlocks[0].value.trim() === "")) {
      return false;
    }

    return true;
  });

  const correctAnswerLabel = String.fromCharCode(65 + question.answerIndex);
  const isCorrect = selectedAnswer === correctAnswerLabel;

  return (
    <Card>
      <CardHeader className="pb-1 pt-2">
        <div className="flex items-center justify-between border-b pb-1 -mx-4 px-3 -mt-2 pt-1.5 bg-gray-50 min-h-[48px]">
          <div className="text-sm font-semibold text-gray-700">
            Question {questionNumber} of {totalQuestions}
          </div>
          <button className="px-2 py-0.5 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-100">
            ABC
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-0 pt-2 pb-2 px-3">
        {/* Question Prompt */}
        <div className="space-y-2 min-h-0 leading-snug">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        {/* Choices */}
        <div className="space-y-1">
          <RadioGroup value={selectedAnswer || ""} onValueChange={onAnswerSelect}>
            {choices.map((label) => {
              const isUserAnswer = selectedAnswer === label;
              const isCorrectAnswer = label === correctAnswerLabel;

              // Determine background and border colors
              let bgColor = "bg-white";
              let borderColor = "border-gray-200";

              // Only show correct/incorrect highlights after answer is submitted
              if (isAnswerSubmitted) {
                if (isUserAnswer && isCorrect) {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                }
              } else if (isUserAnswer) {
                borderColor = "border-blue-600";
              }

              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 p-3 rounded border transition-all cursor-pointer min-h-[48px]
                    ${bgColor} ${borderColor}
                    ${!isAnswerSubmitted && !isUserAnswer ? "hover:bg-gray-50 hover:border-gray-300" : ""}
                  `}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-xs ${
                    isUserAnswer
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-400 bg-white'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 text-sm leading-snug">
                    <BlockRenderer blocks={question.choices[label]} />
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
