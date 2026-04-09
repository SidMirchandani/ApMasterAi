import { BlockRenderer } from "./BlockRenderer";
import { XCircle, Flag, AlertTriangle } from "lucide-react";
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
  /** 4 = A-D only (2026 Digital); 5 = A-E. Used for E→D swap when stored correct is E. */
  mcqOptionCount?: number;
  isFlagged?: boolean;
  onToggleMarkForReview?: () => void;
  onReport?: () => void;
  showQuestionCounter?: boolean;
}

export function PracticeQuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  isAnswerSubmitted = false,
  cheatMode = false,
  mcqOptionCount,
  isFlagged = false,
  onToggleMarkForReview,
  onReport,
  showQuestionCounter = true,
}: PracticeQuizQuestionCardProps) {
  const [crossedOut, setCrossedOut] = useState<Set<string>>(new Set());

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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {showQuestionCounter ? (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Question {questionNumber} of {totalQuestions}
              </span>
            ) : null}
            {onToggleMarkForReview && (
              <button
                type="button"
                onClick={onToggleMarkForReview}
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
            {onReport && (
              <button
                type="button"
                onClick={onReport}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                title="Report an error with this question"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Report</span>
              </button>
            )}
          </div>
        </div>

      <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
          <BlockRenderer blocks={question.prompt_blocks || []} />
      </div>

        <div className="space-y-2">
          {choiceLabels.map((label) => {
            const isUserAnswer = selectedAnswer === label;
            const isCorrectAnswer = label === displayCorrectLabel;
            const isCrossedOut = crossedOut.has(label);

            const opacity = isCrossedOut && !isAnswerSubmitted ? "opacity-40" : "opacity-100";

            const rowClass =
              "w-full rounded-lg border border-slate-200/90 bg-white p-3 text-left text-slate-900 transition-colors dark:border-slate-200/25 dark:bg-white";

            const hoverRow =
              !isAnswerSubmitted && !cheatMode
                ? "hover:bg-slate-50/80 dark:hover:bg-slate-50"
                : "";

            const shouldShowCheatOutline = cheatMode && isCorrectAnswer && !isAnswerSubmitted;

            let letterClass =
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 text-xs font-bold text-slate-600 dark:border-slate-400 dark:text-slate-700";

            if (!isAnswerSubmitted) {
              if (isUserAnswer) {
                letterClass =
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-blue-600 bg-blue-600 text-xs font-bold text-white dark:border-blue-500 dark:bg-blue-500";
              }
            } else {
              if (isCorrectAnswer) {
                letterClass =
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-600 text-xs font-bold text-white dark:border-emerald-500 dark:bg-emerald-500";
              } else if (isUserAnswer && !isCorrect) {
                letterClass =
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-red-600 bg-red-600 text-xs font-bold text-white dark:border-red-500 dark:bg-red-500";
              }
            }

            return (
              <button
                key={label}
                disabled={isAnswerSubmitted}
                onClick={() => onAnswerSelect(label)}
                className={`group/choice relative flex items-start gap-3 ${rowClass} ${hoverRow} ${opacity} ${
                  shouldShowCheatOutline
                    ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-400 dark:bg-emerald-500/10"
                    : ""
                } ${
                  isAnswerSubmitted ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <div className={letterClass}>{label}</div>
                <div
                  className={`flex-1 text-sm leading-snug text-slate-900 dark:text-slate-900 ${
                    isCrossedOut && !isAnswerSubmitted ? "line-through decoration-2" : ""
                  }`}
                >
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
    </div>
  );
}
