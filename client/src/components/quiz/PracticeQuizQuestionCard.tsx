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
    <Card className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-xl transition-all duration-150 ease-out">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Question {questionNumber} of {totalQuestions}
            </span>
            {question.difficulty && ["easy", "medium", "hard"].includes(question.difficulty) && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  question.difficulty === "easy"
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ease-out border ${
                  isBookmarked
                    ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-600"
                    : "bg-white dark:bg-slate-800 text-slate-500 border-slate-300 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
              >
                <BookmarkCheck className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="text-slate-900 dark:text-white leading-relaxed text-xs sm:text-sm">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        <div className="space-y-2">
          {choiceLabels.map((label) => {
            const isUserAnswer = selectedAnswer === label;
            const isCorrectAnswer = label === displayCorrectLabel;
            const isCrossedOut = crossedOut.has(label);

            let borderColor = "border border-slate-200 dark:border-slate-800";
            let bgColor = "bg-white dark:bg-slate-800/50";
            let textColor = "text-slate-700 dark:text-white";
            let ringClass = "";
            let opacity = "opacity-100";

            if (isCrossedOut && !isAnswerSubmitted) {
              opacity = "opacity-40";
            }

            if (cheatMode && isCorrectAnswer && !isAnswerSubmitted) {
              ringClass = "ring-2 ring-green-500";
              borderColor = "border-green-500 dark:border-green-600";
              bgColor = "bg-green-50 dark:bg-green-500/10";
            } else if (isAnswerSubmitted) {
              if (isCorrectAnswer) {
                ringClass = "ring-2 ring-green-500";
                borderColor = "border-green-500 dark:border-green-600";
                bgColor = "bg-green-50 dark:bg-green-500/10";
                textColor = "text-green-700 dark:text-green-300";
              } else if (isUserAnswer && !isCorrect) {
                ringClass = "ring-2 ring-red-500";
                borderColor = "border-red-500 dark:border-red-600";
                bgColor = "bg-red-50 dark:bg-red-500/10";
                textColor = "text-red-700 dark:text-red-300";
              }
            } else if (isUserAnswer) {
              ringClass = "ring-2 ring-blue-500";
              borderColor = "border-blue-500";
              bgColor = "bg-blue-50 dark:bg-blue-500/10";
              textColor = "text-blue-700 dark:text-blue-300";
            } else {
              bgColor = "bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50";
            }

            const hoverRing = !isAnswerSubmitted ? "hover:ring-1 hover:ring-blue-400/40" : "";

            return (
              <button
                key={label}
                disabled={isAnswerSubmitted}
                onClick={() => onAnswerSelect(label)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all duration-150 ease-out text-left relative group/choice
                  ${borderColor} ${bgColor} ${ringClass} ${opacity} ${hoverRing}
                  ${isAnswerSubmitted ? "cursor-default" : "cursor-pointer hover:shadow-sm"}
                `}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center font-bold text-xs transition-colors
                  ${isUserAnswer
                    ? "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300"
                  }
                `}>
                  {label}
                </div>
                <div className={`flex-1 text-sm leading-snug ${textColor} ${isCrossedOut && !isAnswerSubmitted ? 'line-through decoration-2' : ''}`}>
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
                    className="opacity-0 group-hover/choice:opacity-100 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-opacity"
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
