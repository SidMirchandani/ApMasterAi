import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag, Bookmark, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "./BlockRenderer";
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
  subjectId?: string;
  // Legacy fields for backward compatibility
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

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions?: number;
  selectedAnswer: string | null;
  isFlagged: boolean;
  onAnswerSelect: (answer: string) => void;
  onToggleFlag: () => void;
  isFullLength: boolean;
  isAnswerSubmitted?: boolean;
  isReviewMode?: boolean;
  hidePracticeQuizElements?: boolean;
  cheatMode?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** 4 = A-D only (2026 Digital); 5 = A-E. Used for E???D swap when stored correct is E. */
  mcqOptionCount?: number;
}

export function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  isFlagged,
  onAnswerSelect,
  onToggleFlag,
  isFullLength,
  isAnswerSubmitted = false,
  isReviewMode = false,
  hidePracticeQuizElements = false,
  cheatMode = false,
  isBookmarked = false,
  onToggleBookmark,
  mcqOptionCount,
}: QuestionCardProps) {
  const [crossedOut, setCrossedOut] = useState<Set<string>>(new Set());

  if (!question) {
    return null;
  }

  const { choiceLabels, getChoiceBlocks, displayCorrectLabel } = getDisplayChoicesAndCorrect(question, mcqOptionCount);

  const isCorrect = selectedAnswer === displayCorrectLabel;
  const shouldShowCorrectness = isAnswerSubmitted || isFullLength;

  return (
    <Card className={`rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm ${isFlagged ? "ring-2 ring-rose-400 dark:ring-rose-500" : ""}`}>
      <CardHeader className="pb-1 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1 -mx-4 px-3 -mt-2 pt-1.5 bg-slate-50 dark:bg-slate-800/50 min-h-[48px] rounded-t-2xl">
          <div className="flex items-center gap-2">
            {!hidePracticeQuizElements && (
              <div className="bg-slate-900 dark:bg-slate-700 text-white px-2.5 py-0.5 font-bold text-xs rounded-lg">
                {questionNumber}
              </div>
            )}
            {isFullLength && (
              <button
                onClick={onToggleFlag}
                className={`flex items-center gap-1 text-xs font-medium rounded-lg px-1.5 py-0.5 transition-colors ${
                  isFlagged ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Flag className={`h-3 w-3 ${isFlagged ? "fill-current" : ""}`} />
                <span>Mark for Review</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`p-1 rounded-lg transition-colors ${isBookmarked ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this question"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
            {!hidePracticeQuizElements && (
              <button className="px-2 py-0.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                ABC
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-0 pt-2 pb-2 px-3">
        {/* Question Counter for Practice Quizzes */}
        {hidePracticeQuizElements && totalQuestions && (
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Question {questionNumber} of {totalQuestions}
          </div>
        )}

        {/* Question Prompt */}
        <div className="space-y-2 min-h-0 leading-snug">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        {/* Choices */}
        <div className="space-y-1">
          <RadioGroup value={selectedAnswer || ""} onValueChange={onAnswerSelect}>
            {choiceLabels.map((label) => {
              const isUserAnswer = selectedAnswer === label;
              const isCorrectAnswer = label === displayCorrectLabel;
              const isCrossedOut = crossedOut.has(label);

              // Determine the background and border color for this choice
              let bgColor = "bg-white dark:bg-slate-800";
              let borderColor = "border-slate-200 dark:border-slate-600";
              let opacity = "opacity-100";

              if (isCrossedOut && !isAnswerSubmitted && !isReviewMode) {
                opacity = "opacity-40";
              }

              if (cheatMode && isCorrectAnswer && !isAnswerSubmitted && !isReviewMode) {
                bgColor = "bg-green-50 dark:bg-green-900/30";
                borderColor = "border-green-300 dark:border-green-600";
              }

              if (isReviewMode) {
                if (isUserAnswer && isCorrect) {
                  bgColor = "bg-green-50 dark:bg-green-900/30";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50 dark:bg-red-900/30";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  bgColor = "bg-green-50 dark:bg-green-900/30";
                  borderColor = "border-green-500";
                }
              } else if (isAnswerSubmitted) {
                if (isUserAnswer && isCorrect) {
                  bgColor = "bg-green-50 dark:bg-green-900/30";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50 dark:bg-red-900/30";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  bgColor = "bg-green-50 dark:bg-green-900/30";
                  borderColor = "border-green-500";
                }
              } else if (isUserAnswer) {
                borderColor = "border-blue-600";
              }

              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 p-3 rounded border transition-all cursor-pointer min-h-[48px] relative group/choice
                    ${bgColor} ${borderColor} ${opacity}
                    ${!shouldShowCorrectness && !isUserAnswer ? "hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500" : ""}
                  `}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-xs ${
                    isUserAnswer
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40'
                      : "border-slate-400 bg-white dark:bg-slate-700 dark:border-slate-500"
                  }`}>
                    {label}
                  </div>
                  <div className={`flex-1 text-sm leading-snug ${isCrossedOut && !isAnswerSubmitted && !isReviewMode ? 'line-through decoration-2' : ''}`}>
                    <BlockRenderer blocks={getChoiceBlocks(label) ?? []} />
                  </div>
                  {!isAnswerSubmitted && !isReviewMode && (
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
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
