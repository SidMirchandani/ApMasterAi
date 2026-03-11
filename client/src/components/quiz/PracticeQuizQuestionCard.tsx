import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { BlockRenderer } from "./BlockRenderer";
import { BookmarkCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { getDisplayChoicesAndCorrect } from "@/lib/mcqDisplay";

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
  subjectId?: string;
  difficulty?: "easy" | "medium" | "hard";
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
  cheatMode?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** 4 = A-D only (2026 Digital); 5 = A-E. Used for E→D swap when stored correct is E. */
  mcqOptionCount?: number;
}

export function PracticeQuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  isAnswerSubmitted = false,
  cheatMode = false,
  isBookmarked = false,
  onToggleBookmark,
  mcqOptionCount,
}: PracticeQuizQuestionCardProps) {
  const [crossedOut, setCrossedOut] = useState<Set<string>>(new Set());

  if (!question) {
    return null;
  }

  const { choiceLabels, getChoiceBlocks, displayCorrectLabel } = getDisplayChoicesAndCorrect(question, mcqOptionCount);

  const isCorrect = selectedAnswer === displayCorrectLabel;

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Question {questionNumber} of {totalQuestions}
            </span>
            {question.difficulty && ["easy", "medium", "hard"].includes(question.difficulty) && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  question.difficulty === "easy"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : question.difficulty === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                }`}
              >
                {question.difficulty}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  isBookmarked
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-600'
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <BookmarkCheck className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="text-gray-900 dark:text-white leading-relaxed text-base">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        <div className="space-y-3">
          {choiceLabels.map((label) => {
            const isUserAnswer = selectedAnswer === label;
            const isCorrectAnswer = label === displayCorrectLabel;
            const isCrossedOut = crossedOut.has(label);

            let borderColor = "border-gray-200 dark:border-gray-800";
            let bgColor = "bg-white dark:bg-gray-900";
            let textColor = "text-gray-700 dark:text-white";
            let opacity = "opacity-100";

            if (isCrossedOut && !isAnswerSubmitted) {
              opacity = "opacity-40";
            }

            if (cheatMode && isCorrectAnswer && !isAnswerSubmitted) {
              borderColor = "border-green-300 dark:border-green-500";
              bgColor = "bg-green-50/50 dark:bg-green-900/20";
            }

            if (isAnswerSubmitted) {
              if (isCorrectAnswer) {
                borderColor = "border-green-500 dark:border-green-600";
                bgColor = "bg-green-50/50 dark:bg-green-900/20";
                textColor = "text-green-700 dark:text-green-300";
              } else if (isUserAnswer && !isCorrect) {
                borderColor = "border-red-500 dark:border-red-600";
                bgColor = "bg-red-50/50 dark:bg-red-900/20";
                textColor = "text-red-700 dark:text-red-300";
              }
            } else if (isUserAnswer) {
              borderColor = "border-blue-500 dark:border-blue-600";
              bgColor = "bg-blue-50/30 dark:bg-blue-900/10";
              textColor = "text-blue-700 dark:text-blue-300";
            } else {
              bgColor = "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50";
            }

            return (
              <button
                key={label}
                disabled={isAnswerSubmitted}
                onClick={() => onAnswerSelect(label)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left relative group/choice
                  ${borderColor} ${bgColor} ${opacity} ${isAnswerSubmitted ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'}
                `}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-colors
                  ${isUserAnswer 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-white'
                  }
                `}>
                  {label}
                </div>
                <div className={`flex-1 text-base leading-relaxed ${textColor} ${isCrossedOut && !isAnswerSubmitted ? 'line-through decoration-2' : ''}`}>
                  <BlockRenderer blocks={getChoiceBlocks(label) ?? []} />
                </div>
                {!isAnswerSubmitted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCrossedOut(prev => {
                        const next = new Set(prev);
                        if (next.has(label)) next.delete(label);
                        else next.add(label);
                        return next;
                      });
                    }}
                    className="opacity-0 group-hover/choice:opacity-100 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-opacity"
                    title="Cross out"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
