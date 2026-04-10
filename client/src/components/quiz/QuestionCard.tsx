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

  const fullLengthApToolbar = isFullLength && isApClass && !hidePracticeQuizElements;
  const showDashRule = isFullLength || isApClass;

  const markForReviewBtn = isFullLength && (
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
  );

  const reportBookmarkRow = (
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
          <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
        </button>
      )}
    </div>
  );

  const toolbarClassName =
    fullLengthApToolbar
      ? "relative flex min-h-[48px] items-stretch gap-0 bg-slate-100 pr-3 dark:bg-slate-800/75 sm:pr-4"
      : isFullLength
        ? "relative flex min-h-[48px] flex-wrap items-center justify-between gap-2 bg-slate-100 px-3 py-3 sm:px-4 dark:bg-slate-800/75"
        : isApClass
          ? "relative flex min-h-[40px] flex-wrap items-center justify-between gap-2 pb-2"
          : "flex min-h-[40px] flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800";

  const toolbarBody =
    fullLengthApToolbar ? (
      <>
        <div className="flex min-h-[48px] shrink-0 items-center justify-center self-stretch rounded-none bg-[#1a2b42] text-sm font-bold tabular-nums text-white aspect-square">
          {questionNumber}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-2 py-3 pl-3 sm:pl-4">
          <div className="flex min-w-0 items-center gap-2">{markForReviewBtn}</div>
          {reportBookmarkRow}
        </div>
      </>
    ) : (
      <>
        <div className="flex items-center gap-2">
          {!hidePracticeQuizElements && (
            <div
              className={
                isApClass
                  ? "rounded-md bg-[#1a2b42] px-2.5 py-0.5 text-xs font-bold text-white"
                  : "rounded-lg bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-slate-700"
              }
            >
              {questionNumber}
            </div>
          )}
          {markForReviewBtn}
        </div>
        {reportBookmarkRow}
      </>
    );

  return (
    <div className="space-y-4 transition-all duration-150 ease-out">
      {showDashRule ? (
        <div className="flex flex-col gap-0.5">
          <div className={toolbarClassName}>{toolbarBody}</div>
          <div className="ap-long-dash-rule" aria-hidden />
        </div>
      ) : (
        <div className={toolbarClassName}>{toolbarBody}</div>
      )}

      <div className="min-w-0 space-y-3 px-0.5">
        {/* Question Counter for Practice Quizzes */}
        {hidePracticeQuizElements && totalQuestions && (
<div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Question {questionNumber} of {totalQuestions}
          </div>
        )}

        {/* Question Prompt */}
        <div className="min-h-0 min-w-0 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
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
                "min-h-[48px] rounded-lg border-0 bg-slate-50 p-3 text-slate-900 transition-colors dark:bg-slate-900/90 dark:text-slate-100";

              const hoverRow =
                !isAnswerSubmitted
                  ? "cursor-pointer hover:bg-slate-100/90 dark:hover:bg-slate-800/90"
                  : "cursor-default";

              const shouldShowCheatOutline =
                cheatMode && isCorrectAnswer && !isAnswerSubmitted && !isReviewMode;

              let letterClass =
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200";

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
                  className={`group/choice relative flex items-start gap-2 ${rowClass} ${hoverRow} ${opacity} ${
                    shouldShowCheatOutline
                      ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-400 dark:bg-emerald-500/10"
                      : ""
                  }`}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={letterClass}>{label}</div>
                  <div
                    className={`min-w-0 flex-1 text-xs leading-snug text-slate-900 dark:text-slate-100 ${
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
                      className="shrink-0 touch-manipulation rounded-full p-1.5 text-slate-400 opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700 sm:opacity-0 sm:group-hover/choice:opacity-100"
                      title="Cross out"
                      type="button"
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
