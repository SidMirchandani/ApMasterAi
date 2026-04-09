import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag, Bookmark, XCircle, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "./BlockRenderer";
import { useState, useEffect } from "react";
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
  /** Light gray chrome similar to AP Classroom assessment view. */
  examSurfaceVariant?: "default" | "apclassroom";
  onReportError?: () => void;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
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
  examSurfaceVariant = "default",
  onReportError,
}: QuestionCardProps) {
  const [crossedOut, setCrossedOut] = useState<Set<string>>(new Set());
  const isApClass = examSurfaceVariant === "apclassroom";

  useEffect(() => {
    setCrossedOut(new Set());
  }, [question?.id, questionNumber]);

  if (!question) {
    return null;
  }

  const { choiceLabels, getChoiceBlocks, displayCorrectLabel } = getDisplayChoicesAndCorrect(question, mcqOptionCount);

  const isCorrect = selectedAnswer === displayCorrectLabel;

  return (
    <div className="space-y-4 transition-all duration-150 ease-out">
      <div
        className={`flex min-h-[40px] flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800 ${
          isApClass ? "ap-long-blue-dash-divider" : ""
        }`}
      >
          <div className="flex items-center gap-2">
            {!hidePracticeQuizElements && (
              <div
                className={
                  isApClass
                    ? "bg-[#1a2b42] text-white px-2.5 py-0.5 font-bold text-xs rounded-md"
                    : "bg-slate-900 dark:bg-slate-700 text-white px-2.5 py-0.5 font-bold text-xs rounded-lg"
                }
              >
                {questionNumber}
              </div>
            )}
            {isFullLength && (
              <button
                onClick={onToggleFlag}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  isFlagged
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Flag className={`h-3 w-3 ${isFlagged ? "fill-current" : ""}`} />
                <span>Mark for Review</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onReportError && (
              <button
                type="button"
                onClick={onReportError}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                title="Report an error with this question"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Report</span>
              </button>
            )}
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`p-1 rounded-lg transition-colors duration-150 ease-out ${isBookmarked ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this question"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

      <div className="space-y-3 px-0.5">
        {/* Question Counter for Practice Quizzes */}
        {hidePracticeQuizElements && totalQuestions && (
<div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Question {questionNumber} of {totalQuestions}
          </div>
        )}

        {/* Question Prompt */}
        <div className="min-h-0 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        {/* Choices */}
        <div className="space-y-1">
          <RadioGroup value={selectedAnswer || ""} onValueChange={onAnswerSelect}>
            {choiceLabels.map((label) => {
              const isUserAnswer = selectedAnswer === label;
              const isCorrectAnswer = label === displayCorrectLabel;
              const isCrossedOut = crossedOut.has(label);

              const opacity =
                isCrossedOut && !isAnswerSubmitted && !isReviewMode ? "opacity-40" : "opacity-100";

              const rowClass =
                "min-h-[48px] rounded-lg border border-slate-200/90 bg-white p-3 text-slate-900 transition-colors dark:border-slate-200/25 dark:bg-white";

              const hoverRow =
                !isAnswerSubmitted
                  ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-50"
                  : "cursor-default";

              const shouldShowCheatOutline =
                cheatMode && isCorrectAnswer && !isAnswerSubmitted && !isReviewMode;

              let letterClass =
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 text-xs font-bold text-slate-600 dark:border-slate-400 dark:text-slate-700";

              if (!isAnswerSubmitted) {
                if (isUserAnswer) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-blue-600 bg-blue-600 text-xs font-bold text-white dark:border-blue-500 dark:bg-blue-500";
                }
              } else if (isReviewMode) {
                if (isUserAnswer && isCorrect) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-600 text-xs font-bold text-white dark:border-emerald-500 dark:bg-emerald-500";
                } else if (isUserAnswer && !isCorrect) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-red-600 bg-red-600 text-xs font-bold text-white dark:border-red-500 dark:bg-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-600 text-xs font-bold text-white dark:border-emerald-500 dark:bg-emerald-500";
                }
              } else if (isAnswerSubmitted) {
                if (isUserAnswer && isCorrect) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-600 text-xs font-bold text-white dark:border-emerald-500 dark:bg-emerald-500";
                } else if (isUserAnswer && !isCorrect) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-red-600 bg-red-600 text-xs font-bold text-white dark:border-red-500 dark:bg-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  letterClass =
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-600 text-xs font-bold text-white dark:border-emerald-500 dark:bg-emerald-500";
                }
              }

              return (
                <div
                  key={label}
                  className={`group/choice relative flex items-center gap-2 ${rowClass} ${hoverRow} ${opacity} ${
                    shouldShowCheatOutline
                      ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-400 dark:bg-emerald-500/10"
                      : ""
                  }`}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={letterClass}>{label}</div>
                  <div
                    className={`flex-1 text-xs leading-snug text-slate-900 dark:text-slate-900 ${
                      isCrossedOut && !isAnswerSubmitted && !isReviewMode ? "line-through decoration-2" : ""
                    }`}
                  >
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
      </div>
    </div>
  );
}
