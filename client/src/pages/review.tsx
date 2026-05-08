import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ToastAction } from "@/components/ui/toast";
import Navigation from "@/components/ui/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  getSubjectByLegacyId,
  getSubjectByCode,
  getUnitDisplayLabel,
} from "@/subjects";
import {
  getDisplayCorrectLabel,
  getDisplayExplanation,
} from "@/lib/mcqDisplay";
import {
  PrettyExplanation,
  QUIZ_EXPLANATION_CLASSNAME,
  QUIZ_QUESTION_EXPL_GRID_CLASS,
} from "@/components/ui/PrettyExplanation";
import { ExplanationPanel } from "@/components/quiz/ExplanationPanel";
import { PracticeQuizQuestionCard } from "@/components/quiz/PracticeQuizQuestionCard";
import { ReportQuestionDialog } from "@/components/quiz/ReportQuestionDialog";
import { ExamToolbar } from "@/components/quiz/ExamToolbar";
import { normalizeQuestion } from "@/lib/normalizeQuestion";
import { showPracticeExamToolHeader } from "@/lib/examTools";

interface DueQuestion {
  questionId: string;
  subjectId: string;
  unitId: string;
  sectionCode?: string;
  correctStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  nextReviewAt: string;
  prompt?: string;
  prompt_blocks?: any[];
  choices?: string[] | Record<string, any>;
  answerIndex?: number;
  explanation?: string;
  difficulty?: string;
  tags?: string[];
}

export default function ReviewPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subjectId = router.query.subject as string | undefined;
  const unit = router.query.unit as string | undefined;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cheatMode, setCheatMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [questionGridOpen, setQuestionGridOpen] = useState(false);

  useEffect(() => {
    const syncCheatMode = () => {
      setCheatMode(localStorage.getItem("adminCheatMode") === "true");
    };
    syncCheatMode();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "adminCheatMode") {
        syncCheatMode();
      }
    };
    const onCheatModeChanged = () => {
      syncCheatMode();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("admin-cheat-mode-changed", onCheatModeChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "admin-cheat-mode-changed",
        onCheatModeChanged,
      );
    };
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const {
    data: dueResponse,
    isLoading: dueLoading,
    refetch: refetchDue,
  } = useQuery<{
    success: boolean;
    data: DueQuestion[];
  }>({
    queryKey: ["dueReviews", subjectId || "all", unit || ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subjectId) params.set("subjectId", subjectId);
      if (unit) params.set("unitId", unit);
      params.set("limit", "50");
      const url = `/api/user/questions/due?${params.toString()}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch due reviews");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const reviewQuestions = dueResponse?.data ?? [];

  const isLoading = dueLoading;
  const refetch = () => {
    void refetchDue();
  };

  useEffect(() => {
    if (reviewQuestions.length > 0 && currentIndex >= reviewQuestions.length) {
      setCurrentIndex(Math.max(0, reviewQuestions.length - 1));
    }
  }, [reviewQuestions.length, currentIndex]);

  const currentQuestion = reviewQuestions[currentIndex];
  const subject = currentQuestion?.subjectId
    ? getSubjectByLegacyId(currentQuestion.subjectId) ||
      getSubjectByCode(currentQuestion.subjectId)
    : getSubjectByLegacyId(subjectId || "") ||
      getSubjectByCode(subjectId || "");
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const normalizedQuestion = currentQuestion
    ? normalizeQuestion({ ...currentQuestion, id: currentQuestion.questionId })
    : null;
  const reviewCorrectLabel =
    currentQuestion?.answerIndex !== undefined
      ? getDisplayCorrectLabel(
          { answerIndex: currentQuestion.answerIndex },
          mcqOptionCount,
        )
      : "";
  const isReviewAnswerCorrect =
    isSubmitted && !!selectedAnswer && selectedAnswer === reviewCorrectLabel;

  const handleAnswerSelect = (answer: string) => {
    if (!isSubmitted) setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer) return;
    setIsSubmitted(true);

    const correctLetter =
      currentQuestion.answerIndex !== undefined
        ? getDisplayCorrectLabel(
            { answerIndex: currentQuestion.answerIndex },
            mcqOptionCount,
          )
        : null;
    const isCorrect = selectedAnswer === correctLetter;

    try {
      await apiRequest("POST", "/api/user/questions/track", {
        questionId: currentQuestion.questionId,
        subjectId: currentQuestion.subjectId,
        unitId: currentQuestion.unitId || "",
        correct: isCorrect,
        timeSpentSec: 0,
        sectionCode: currentQuestion.sectionCode || "",
      });
    } catch {}
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (!isSubmitted && !selectedAnswer) return;
    if (currentIndex < reviewQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
  };

  const handleNavNext = () => {
    if (isSubmitted) handleNext();
    else handleSkip();
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < reviewQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
  };

  const handleRemove = async () => {
    if (!currentQuestion) return;
    const removedQuestion = currentQuestion;
    setIsRemoving(true);
    try {
      await apiRequest("POST", "/api/user/questions/remove", {
        questionId: removedQuestion.questionId,
      });
      queryClient.invalidateQueries({ queryKey: ["dueReviews"] });
      await refetch();
      if (
        currentIndex >= reviewQuestions.length - 1 &&
        reviewQuestions.length > 1
      ) {
        setCurrentIndex(reviewQuestions.length - 2);
      }
      setSelectedAnswer(null);
      setIsSubmitted(false);
      toast({
        title: "Question removed from review",
        action: (
          <ToastAction
            altText="Undo remove"
            onClick={async () => {
              try {
                await apiRequest("POST", "/api/user/questions/restore", {
                  questionId: removedQuestion.questionId,
                });
                refetch();
              } catch {}
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    } catch {
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500 dark:border-t-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
      <Navigation />

      {reviewQuestions.length === 0 ? (
        <div className="container mx-auto max-w-6xl flex-1 px-3 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <RotateCcw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Review Questions
            </h1>
          </div>
          <div className="py-10 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
              All caught up!
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              No questions to review. Items you miss during practice are added
              here so you can try them again.
            </p>
            <Button
              onClick={() =>
                router.push(
                  subjectId ? `/study?subject=${subjectId}` : "/dashboard",
                )
              }
              className="rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {subjectId ? "Back to study" : "Start Practicing"}
            </Button>
          </div>
        </div>
      ) : currentQuestion && normalizedQuestion ? (
        <>
          <div className="fixed left-0 right-0 top-[calc(3.75rem+1px)] z-40 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-[#0B0F1A]">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-3 py-1.5 sm:gap-3">
              <div className="flex flex-1 items-center justify-center gap-1 sm:justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="h-9 w-9 shrink-0 rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Popover
                  open={questionGridOpen}
                  onOpenChange={setQuestionGridOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                    >
                      Question {currentIndex + 1} of {reviewQuestions.length}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          questionGridOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    sideOffset={8}
                    className="w-auto border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 data-[state=closed]:animate-none data-[state=open]:animate-none"
                  >
                    <div className="grid max-h-[min(50vh,20rem)] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-8">
                      {reviewQuestions.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setCurrentIndex(i);
                            setSelectedAnswer(null);
                            setIsSubmitted(false);
                            setQuestionGridOpen(false);
                          }}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                            i === currentIndex
                              ? "bg-blue-600 text-white dark:bg-blue-500"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15",
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleNavNext}
                  disabled={currentIndex >= reviewQuestions.length - 1}
                  className="h-9 w-9 shrink-0 rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10"
                  title={isSubmitted ? "Next question" : "Skip"}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto sm:justify-end">
                {showPracticeExamToolHeader(currentQuestion.subjectId) && (
                  <ExamToolbar
                    subjectId={currentQuestion.subjectId}
                    size="sm"
                    className="mr-0.5"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(
                      subjectId ? `/study?subject=${subjectId}` : "/dashboard",
                    )
                  }
                  className="h-8 rounded-full px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                >
                  Exit
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 pt-[calc(3.75rem+1px+0.25rem)]">
            <div className="mx-auto max-w-6xl px-2 sm:px-3">
              {(subjectId || currentQuestion.subjectId) &&
                currentQuestion.unitId && (
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {getUnitDisplayLabel(
                      subjectId || currentQuestion.subjectId,
                      currentQuestion.unitId,
                    )}
                  </p>
                )}
              <div className={QUIZ_QUESTION_EXPL_GRID_CLASS}>
                <div className="min-w-0">
                  <PracticeQuizQuestionCard
                    question={normalizedQuestion}
                    questionNumber={currentIndex + 1}
                    totalQuestions={reviewQuestions.length}
                    selectedAnswer={selectedAnswer}
                    onAnswerSelect={handleAnswerSelect}
                    isAnswerSubmitted={isSubmitted}
                    cheatMode={cheatMode}
                    mcqOptionCount={mcqOptionCount}
                    showQuestionCounter={false}
                    onReport={() => setShowReportDialog(true)}
                    onRemove={handleRemove}
                    removeDisabled={isRemoving}
                  />
                </div>
                <div
                  className={`min-w-0 md:sticky md:top-4 ${isSubmitted ? "md:self-start" : "md:self-stretch"}`}
                >
                  <ExplanationPanel
                    hasAnswered={isSubmitted}
                    isCorrect={isReviewAnswerCorrect}
                    className={isSubmitted ? "" : "h-full"}
                  >
                    {isSubmitted && (
                      <>
                        <p className="text-[0.775rem] font-medium leading-relaxed">
                          {isReviewAnswerCorrect
                            ? "Correct."
                            : `Incorrect. The correct answer is ${getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex ?? 0 }, mcqOptionCount)}.`}
                        </p>
                        {currentQuestion.explanation ? (
                          <PrettyExplanation
                            className={QUIZ_EXPLANATION_CLASSNAME}
                          >
                            {getDisplayExplanation(
                              currentQuestion.explanation,
                              { answerIndex: currentQuestion.answerIndex ?? 0 },
                              mcqOptionCount,
                            )}
                          </PrettyExplanation>
                        ) : null}
                      </>
                    )}
                  </ExplanationPanel>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
            <div className="pointer-events-auto">
              {!isSubmitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className="min-h-12 rounded-full border border-slate-200/80 bg-blue-600 px-8 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500 dark:shadow-lg dark:hover:bg-blue-600"
                >
                  Submit
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentIndex >= reviewQuestions.length - 1}
                  className="min-h-12 rounded-full border border-slate-200/80 bg-blue-600 px-8 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500 dark:shadow-lg dark:hover:bg-blue-600"
                >
                  Next
                </Button>
              )}
            </div>
          </div>

          <ReportQuestionDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            questionId={currentQuestion?.questionId}
            subjectId={currentQuestion?.subjectId || subjectId || ""}
          />
        </>
      ) : null}
    </div>
  );
}
