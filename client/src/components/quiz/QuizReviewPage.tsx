import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import { QuizHeader } from "./QuizHeader";
import { TestFloatingNav } from "./TestFloatingNav";
import { getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { ReportQuestionDialog } from "./ReportQuestionDialog";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

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

interface QuizReviewPageProps {
  questions: Question[];
  userAnswers: { [key: number]: string };
  flaggedQuestions: Set<number>;
  subjectId?: string;
  onBack: () => void;
  onSubmit?: (
    updatedAnswers: { [key: number]: string },
    updatedFlagged: Set<number>,
  ) => void;
  isSubmitting?: boolean;
  /** When true, sit below the app Navigation bar (same as full-length quiz page). */
  hasAppNav?: boolean;
}

export function QuizReviewPage({
  questions,
  userAnswers,
  flaggedQuestions,
  subjectId,
  onBack,
  onSubmit,
  isSubmitting,
  hasAppNav = false,
}: QuizReviewPageProps) {
  const belowNav = hasAppNav ? "top-[calc(3.75rem+1px)]" : "top-0";
  const contentTop =
    hasAppNav
      ? "pt-[calc(3.75rem+1px+4rem+1px)] max-md:pt-[calc(3.75rem+1px+4.875rem+1px)]"
      : "pt-[calc(4rem+1px)] max-md:pt-[calc(4.875rem+1px)]";
  const subject = subjectId ? getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId) : undefined;
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [localAnswers, setLocalAnswers] = useState(userAnswers);
  const [localFlagged, setLocalFlagged] = useState(flaggedQuestions);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setLocalAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleToggleFlag = (questionIndex: number) => {
    setLocalFlagged((prev) => {
      const updated = new Set(prev);
      if (updated.has(questionIndex)) updated.delete(questionIndex);
      else updated.add(questionIndex);
      return updated;
    });
  };

  const renderImage = (urls?: string[]) => {
    if (!urls?.length) return null;
    return urls.map((url, i) => (
      <img
        key={i}
        src={url}
        className="max-w-full h-auto mb-4 rounded-lg shadow-md"
      />
    ));
  };

  return (
    <div className="relative flex h-screen flex-col bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
      {/* Blur overlay during submit */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-sm dark:bg-[#0B0F1A]/90">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500 dark:border-t-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Submitting your test…
            </p>
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <div className={cn("fixed left-0 right-0 z-50", belowNav)}>
        <QuizHeader
          title={
            selectedQuestion === null
              ? "Review Your Answers"
              : subjectId
                ? `AP® ${subjectId.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")} Practice Exam`
                : "Review Your Answers"
          }
          timeElapsed={0}
          timerHidden
          subjectId={subjectId}
          onExitExam={selectedQuestion === null ? onBack : undefined}
          headerVariant="default"
        />
      </div>

      {/* ====================== PALETTE MODE ====================== */}
      {selectedQuestion === null ? (
        <>
          <div className={cn("flex-1 overflow-y-auto pb-32", contentTop)}>
            <div className="mx-auto max-w-7xl px-4 py-3">
              <Card className="border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-white/[0.04]">
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded border-2 border-gray-400 border-dashed"></div>
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-blue-700 border-2 border-blue-700"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-gray-800 border-2 border-gray-800"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded border-2 border-red-600 flex items-center justify-center">
                      <Flag className="h-2.5 w-2.5 text-red-600" />
                    </div>
                    <span>For Review</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid gap-2 grid-cols-10">
                  {questions.map((_, index) => {
                    const answered = localAnswers[index] != null;
                    const flagged = localFlagged.has(index);
                    const isCurrent = selectedQuestion === index;

                    const base =
                      "relative aspect-square max-w-[55px] min-w-[40px] rounded flex items-center justify-center font-semibold text-[11px] transition-all hover:shadow-md cursor-pointer";

                    const cls = isCurrent
                      ? "bg-gray-800 text-white border-2 border-gray-800"
                      : flagged
                        ? answered
                          ? "bg-blue-700 text-white border-2 border-red-600"
                          : "bg-white text-gray-900 border-2 border-red-600"
                        : answered
                          ? "bg-blue-700 text-white border-2 border-blue-700"
                          : "border-2 border-gray-400 border-dashed bg-white";

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedQuestion(index)}
                        className={`${base} ${cls}`}
                      >
                        {index + 1}
                        {flagged && !isCurrent && (
                          <Flag className="h-2.5 w-2.5 text-red-600 absolute -top-0.5 -right-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
            {onSubmit && (
              <div className="pointer-events-auto">
                <Button
                  onClick={() => onSubmit(localAnswers, localFlagged)}
                  className="min-h-12 rounded-full border border-slate-200/80 bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500 dark:shadow-lg dark:hover:bg-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Test"}
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ====================== QUESTION MODE ====================== */
        <div className={cn("flex-1 overflow-y-auto pb-32", contentTop)}>
          <div className="mx-auto max-w-3xl px-2 pb-6 pt-0 sm:px-3">
            <QuestionCard
              question={questions[selectedQuestion]}
              questionNumber={selectedQuestion + 1}
              selectedAnswer={localAnswers[selectedQuestion]}
              isFlagged={localFlagged.has(selectedQuestion)}
              onAnswerSelect={(a) => handleAnswerChange(selectedQuestion, a)}
              onToggleFlag={() => handleToggleFlag(selectedQuestion)}
              isFullLength
              isReviewMode
              isAnswerSubmitted={false}
              mcqOptionCount={mcqOptionCount}
              examSurfaceVariant="default"
              onReportError={() => setShowReportDialog(true)}
            />
          </div>
        </div>
      )}

      {/* ====================== NAV BAR ====================== */}
      {selectedQuestion !== null && (
        <TestFloatingNav
          currentIndex={selectedQuestion}
          totalQuestions={questions.length}
          userAnswers={localAnswers}
          flaggedQuestions={localFlagged}
          canGoPrevious
          canGoNext={selectedQuestion < questions.length - 1}
          onPrevious={() => {
            if (selectedQuestion > 0) {
              setSelectedQuestion(selectedQuestion - 1);
            } else {
              setSelectedQuestion(null);
            }
          }}
          onNext={() => {
            if (selectedQuestion < questions.length - 1) {
              setSelectedQuestion(selectedQuestion + 1);
            }
          }}
          onGoTo={(i) => setSelectedQuestion(i)}
          onEndReview={
            selectedQuestion === questions.length - 1
              ? () => setSelectedQuestion(null)
              : undefined
          }
        />
      )}

      <ReportQuestionDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={
          selectedQuestion !== null ? questions[selectedQuestion]?.id : undefined
        }
        subjectId={subjectId ?? ""}
      />
    </div>
  );
}
