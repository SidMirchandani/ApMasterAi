import { useState, useEffect, useRef, useMemo } from "react";
import { PracticeQuizHeader } from "./PracticeQuizHeader";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import {
  getDisplayCorrectLabel,
  getDisplayExplanation,
} from "@/lib/mcqDisplay";
import {
  getPrimerNoteItems,
  shouldShowStudyNotesPrimer,
} from "@/lib/studyNote";
import {
  PrettyExplanation,
  QUIZ_EXPLANATION_CLASSNAME,
  QUIZ_QUESTION_EXPL_GRID_CLASS,
} from "@/components/ui/PrettyExplanation";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { PracticeQuizReview } from "./PracticeQuizReview";
import { ReportQuestionDialog } from "./ReportQuestionDialog";
import { ExplanationPanel } from "./ExplanationPanel";
import { Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AdminAutoAnswerDialog } from "./AdminAutoAnswerDialog";
import { MicroDrillCheckpoint } from "./MicroDrillCheckpoint";
import {
  getMicroDrillCheckpoint,
  MICRO_DRILL_ROUND_SIZE,
} from "@/lib/micro-drill-checkpoint";
import { useQuizEngine } from "@/hooks/useQuizEngine";
import {
  getAnalyticsPageParams,
  trackVersionedAnalyticsEvent,
} from "@/lib/firebase";

interface Question {
  id: string;
  prompt: string;
  choices: any; // Using any to match the variant shapes from different components
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
  prompt_blocks: any[];
  difficulty?: "easy" | "medium" | "hard";
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
  tags?: string[];
  test_slug?: string | null;
}

export interface UnitQuizState {
  questionIds: string[];
  currentQuestionIndex: number;
  userAnswers: { [key: number]: string };
  flaggedQuestions?: number[];
}

interface PracticeQuizProps {
  questions: Question[];
  subjectId: string;
  timeElapsed: number;
  onExit: () => void;
  onComplete: (score: number, userAnswers?: { [key: number]: string }) => void;
  isFullLength?: boolean;
  lastSavedTestId?: string;
  onSaveAndExit?: (state: UnitQuizState) => void;
  savedState?: UnitQuizState | null;
  enableStudyNotesPrimer?: boolean;
  microDrillMode?: boolean;
  goalScore?: 4 | 5;
  roundNumber?: number;
  sessionCorrect?: number;
  sessionTotal?: number;
  onRoundContinue?: (roundCorrect: number, roundTotal: number) => void;
  onEndPractice?: () => void;
  loadingNextRound?: boolean;
}

export function PracticeQuiz({
  questions,
  subjectId,
  timeElapsed,
  onExit,
  onComplete,
  isFullLength = false,
  lastSavedTestId,
  onSaveAndExit,
  savedState,
  enableStudyNotesPrimer = false,
  microDrillMode = false,
  goalScore = 4,
  roundNumber = 1,
  sessionCorrect = 0,
  sessionTotal = 0,
  onRoundContinue,
  onEndPractice,
  loadingNextRound = false,
}: PracticeQuizProps) {
  const { currentQuestionIndex, userAnswers, setAnswer, next } = useQuizEngine({
    initialIndex: 0,
    initialAnswers: {},
    totalQuestions: questions.length,
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [finalUserAnswers, setFinalUserAnswers] = useState<{
    [key: number]: string;
  }>({});
  const [cheatMode, setCheatMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showConceptPrimer, setShowConceptPrimer] = useState(false);
  const [showRoundCheckpoint, setShowRoundCheckpoint] = useState(false);
  const [showAutoAnswerDialog, setShowAutoAnswerDialog] = useState(false);

  const appliedSavedState = useRef(false);
  const hasShownSessionPrimer = useRef(false);
  const trackedPracticeStartRef = useRef<string | null>(null);
  // Initialize from saved state when resuming a unit quiz (only once)
  useEffect(() => {
    if (savedState && questions.length > 0 && !appliedSavedState.current) {
      appliedSavedState.current = true;
      setFinalUserAnswers(savedState.userAnswers || {});
    }
  }, [savedState, questions.length]);

  const router = useRouter();
  const { user } = useAuth();
  const { data: userProfile } = useQuery<{
    success: boolean;
    data?: { state?: string | null };
  }>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/me");
      return response.json();
    },
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  const subject =
    getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const unitParam =
    typeof router.query.unit === "string" ? router.query.unit : undefined;

  const showPracticeHeader = !isFullLength;
  const practiceHeaderTitle = `${subject?.displayName ?? "Practice"} - Practice Quiz`;
  const practiceHeaderOffsetClass =
    "md:pt-[calc(5rem+1px)] max-md:pt-[calc(3.75rem+1px+4.25rem+1px-5.5rem)]";

  const getQuizAnalyticsParams = (
    surface: "quiz" | "result" = "quiz",
    method: "practice" = "practice",
  ) =>
    getAnalyticsPageParams({
      surface,
      subject: subjectId,
      unit: unitParam,
      pagePath: surface === "result" ? "/review" : "/quiz",
      pageReferrer:
        typeof window !== "undefined"
          ? `${window.location.origin}${surface === "result" ? "/quiz" : "/study"}`
          : null,
      state: userProfile?.data?.state ?? null,
      method,
    });

  useEffect(() => {
    if (user && userProfile === undefined) return;
    if (!router.isReady || questions.length === 0) return;
    const trackingKey = `${subjectId}:${unitParam ?? ""}:${questions.length}`;
    if (trackedPracticeStartRef.current === trackingKey) return;
    trackedPracticeStartRef.current = trackingKey;

    void trackVersionedAnalyticsEvent({
      action: "practice_start",
      params: getQuizAnalyticsParams(),
    });
  }, [router.isReady, subjectId, unitParam, questions.length, user, userProfile]);

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
    if (!cheatMode) {
      setShowAutoAnswerDialog(false);
    }
  }, [cheatMode]);

  const orderedQuestions = isFullLength ? [...questions].reverse() : questions;
  const primerBatchQuestions = useMemo(
    () =>
      microDrillMode
        ? orderedQuestions
        : orderedQuestions.slice(0, MICRO_DRILL_ROUND_SIZE),
    [orderedQuestions, microDrillMode],
  );
  const primerNoteItems = useMemo(
    () => getPrimerNoteItems(primerBatchQuestions),
    [primerBatchQuestions],
  );

  useEffect(() => {
    if (!enableStudyNotesPrimer || questions.length === 0) return;
    if (hasShownSessionPrimer.current) return;
    if (microDrillMode && roundNumber !== 1) return;
    if (savedState && savedState.currentQuestionIndex > 0) return;
    if (!shouldShowStudyNotesPrimer(primerBatchQuestions)) return;

    hasShownSessionPrimer.current = true;
    setShowConceptPrimer(true);
    setShowRoundCheckpoint(false);
  }, [
    enableStudyNotesPrimer,
    questions.length,
    savedState,
    microDrillMode,
    roundNumber,
    primerBatchQuestions,
  ]);

  const dismissConceptPrimer = () => {
    setShowConceptPrimer(false);
  };

  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const feedbackCorrectLabel = currentQuestion
    ? getDisplayCorrectLabel(currentQuestion, mcqOptionCount)
    : "";
  const isCurrentAnswerCorrect =
    isAnswerSubmitted &&
    !!selectedAnswer &&
    selectedAnswer === feedbackCorrectLabel;

  const handleAnswerSelect = (answer: string) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    setIsAnswerSubmitted(true);
    setAnswer(currentQuestionIndex, selectedAnswer);
    setFinalUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: selectedAnswer,
    }));

    const correctLabel = getDisplayCorrectLabel(
      currentQuestion,
      mcqOptionCount,
    );
    const isCorrect = selectedAnswer === correctLabel;
    if (isCorrect) setScore((s) => s + 1);

    void trackVersionedAnalyticsEvent({
      action: "question_answered",
      params: getQuizAnalyticsParams(),
    });

    if (user) {
      apiRequest("POST", "/api/user/questions/track", {
        questionId: currentQuestion.id,
        subjectId,
        unitId: currentQuestion.id.split("_")[1] || "",
        correct: isCorrect,
        timeSpentSec: 0,
        sectionCode: currentQuestion.section_code || "",
        prompt:
          currentQuestion.prompt ||
          (currentQuestion.prompt_blocks
            ? currentQuestion.prompt_blocks
                .filter((b: any) => b.type === "text")
                .map((b: any) => b.value)
                .join(" ")
            : ""),
        choices: currentQuestion.choices,
        answerIndex: currentQuestion.answerIndex,
        explanation: currentQuestion.explanation || "",
      }).catch(() => {});
    }

    // Unit score is updated only when the student completes the full quiz (see quiz.tsx), not per-answer.
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < orderedQuestions.length) {
      next();
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else if (microDrillMode && onRoundContinue && onEndPractice) {
      const answersWithLast = {
        ...finalUserAnswers,
        [currentQuestionIndex]: selectedAnswer ?? "",
      };
      setFinalUserAnswers(answersWithLast);
      setShowRoundCheckpoint(true);
    } else {
      if (isFullLength && lastSavedTestId) {
        router.push(
          `/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`,
        );
      } else {
        setShowResults(true);
        const answersWithLast = {
          ...finalUserAnswers,
          [currentQuestionIndex]: selectedAnswer ?? "",
        };
        void trackVersionedAnalyticsEvent({
          action: "practice_complete",
          params: getQuizAnalyticsParams(),
        });
        void trackVersionedAnalyticsEvent({
          action: "result_viewed",
          params: getQuizAnalyticsParams("result"),
        });
        onComplete(score, answersWithLast);
      }
    }
  };

  const handleReview = () => {
    if (isFullLength && lastSavedTestId) {
      router.push(
        `/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`,
      );
    } else {
      setShowResults(false);
      setIsReviewMode(true);
    }
  };

  const handleCloseReview = () => {
    setIsReviewMode(false);
    onExit();
  };

  const handleAdminAutoAnswerApply = (answers: { [key: number]: string }) => {
    if (!cheatMode) return;
    const correctCount = orderedQuestions.reduce((count, q, idx) => {
      const correctLabel = getDisplayCorrectLabel(q, mcqOptionCount);
      return answers[idx] === correctLabel ? count + 1 : count;
    }, 0);
    setFinalUserAnswers(answers);
    setScore(correctCount);
    setShowResults(true);
    onComplete(correctCount, answers);
  };

  const buildUnitQuizStateForExit = (): UnitQuizState => {
    const merged = { ...finalUserAnswers };
    if (selectedAnswer) merged[currentQuestionIndex] = selectedAnswer;
    return {
      questionIds: orderedQuestions.map((q) => q.id),
      currentQuestionIndex,
      userAnswers: merged,
    };
  };

  const handleHeaderExit = () => {
    if (onSaveAndExit) {
      onSaveAndExit(buildUnitQuizStateForExit());
    } else {
      onExit();
    }
  };

  if (microDrillMode && showRoundCheckpoint && onRoundContinue && onEndPractice) {
    const roundTotal = orderedQuestions.length;
    const checkpoint = getMicroDrillCheckpoint({
      roundCorrect: score,
      roundTotal,
      sessionCorrect: sessionCorrect + score,
      sessionTotal: sessionTotal + roundTotal,
      roundNumber,
      goalScore,
      subjectId,
    });
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-[#0B0F1A] dark:text-slate-100">
        {showPracticeHeader && (
          <div className="fixed left-0 right-0 top-[calc(3.75rem+1px)] z-40">
            <PracticeQuizHeader
              title={practiceHeaderTitle}
              subjectId={subjectId}
              onExitExam={handleHeaderExit}
            />
          </div>
        )}
        <div className={showPracticeHeader ? practiceHeaderOffsetClass : ""}>
          <MicroDrillCheckpoint
            result={checkpoint}
            roundNumber={roundNumber}
            sessionTotal={sessionTotal + roundTotal}
            loading={loadingNextRound}
            onEnd={onEndPractice}
            onContinue={() => onRoundContinue(score, roundTotal)}
          />
        </div>
      </div>
    );
  }

  if (isReviewMode) {
    return (
      <PracticeQuizReview
        questions={orderedQuestions}
        userAnswers={finalUserAnswers}
        onClose={handleCloseReview}
        subjectId={subjectId}
      />
    );
  }

  const CHUNK_SIZE = microDrillMode ? orderedQuestions.length : MICRO_DRILL_ROUND_SIZE;
  const chunkIndex = microDrillMode
    ? 0
    : Math.floor(currentQuestionIndex / MICRO_DRILL_ROUND_SIZE);
  const chunkQuestions = orderedQuestions.slice(
    chunkIndex * (microDrillMode ? orderedQuestions.length : MICRO_DRILL_ROUND_SIZE),
    chunkIndex * (microDrillMode ? orderedQuestions.length : MICRO_DRILL_ROUND_SIZE) +
      (microDrillMode ? orderedQuestions.length : MICRO_DRILL_ROUND_SIZE),
  );

  if (showConceptPrimer && enableStudyNotesPrimer && primerNoteItems.length > 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
        {showPracticeHeader && (
          <div className="fixed left-0 right-0 top-[calc(3.75rem+1px)] z-40">
            <PracticeQuizHeader
              title={practiceHeaderTitle}
              subjectId={subjectId}
              onExitExam={handleHeaderExit}
            />
          </div>
        )}
        <div
          className={`flex flex-1 overflow-y-auto ${
            showPracticeHeader ? practiceHeaderOffsetClass : ""
          }`}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
            <h2 className="mb-2 text-center text-lg font-semibold text-slate-800 dark:text-slate-200">
              Quick review before these {primerBatchQuestions.length} questions
            </h2>
            <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Skim these points, then start practice.
            </p>
            <div className="max-h-[min(50vh,420px)] w-full overflow-y-auto rounded-2xl bg-slate-100 p-5 dark:bg-white/[0.06]">
              <ol className="list-decimal space-y-4 pl-5 text-sm text-gray-800 dark:text-gray-200">
                {primerNoteItems.map((item) => (
                  <li key={item.index} className="pl-1">
                    <PrettyExplanation className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      {item.note}
                    </PrettyExplanation>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-8 flex justify-center">
              <Button
                onClick={dismissConceptPrimer}
                className="rounded-full bg-blue-600 px-8 py-2.5 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Start practice
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
      {showPracticeHeader && (
        <div className="fixed left-0 right-0 top-[calc(3.75rem+1px)] z-40">
          <PracticeQuizHeader
            title={practiceHeaderTitle}
            subjectId={subjectId}
            onExitExam={handleHeaderExit}
          />
        </div>
      )}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          showPracticeHeader ? practiceHeaderOffsetClass : ""
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] sm:pb-32">
          <div
            className={`mx-auto max-w-6xl px-2 sm:px-3 ${showPracticeHeader ? "pb-1 pt-0" : "py-2"}`}
          >
            <div className={QUIZ_QUESTION_EXPL_GRID_CLASS}>
              <div className="min-w-0">
                <PracticeQuizQuestionCard
                  question={currentQuestion}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={orderedQuestions.length}
                  selectedAnswer={selectedAnswer}
                  onAnswerSelect={handleAnswerSelect}
                  isAnswerSubmitted={isAnswerSubmitted}
                  cheatMode={cheatMode}
                  mcqOptionCount={mcqOptionCount}
                  onReport={() => setShowReportDialog(true)}
                />
              </div>
              <div
                className={`min-w-0 md:sticky md:top-4 ${isAnswerSubmitted ? "md:self-start" : "md:self-stretch"}`}
              >
                <ExplanationPanel
                  hasAnswered={isAnswerSubmitted}
                  isCorrect={isCurrentAnswerCorrect}
                  className={isAnswerSubmitted ? "" : "h-full"}
                >
                  {isAnswerSubmitted && currentQuestion && (
                    <>
                      <p className="text-[0.775rem] font-medium leading-relaxed">
                        {selectedAnswer === feedbackCorrectLabel
                          ? "Correct."
                          : `Incorrect. The correct answer is ${feedbackCorrectLabel}.`}
                      </p>
                      {currentQuestion.explanation ? (
                        <PrettyExplanation
                          className={QUIZ_EXPLANATION_CLASSNAME}
                        >
                          {getDisplayExplanation(
                            currentQuestion.explanation,
                            currentQuestion,
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
      </div>

      {cheatMode && (
        <div className="pointer-events-auto fixed bottom-4 left-3 z-50 sm:bottom-6 sm:left-5">
          <Button
            onClick={() => setShowAutoAnswerDialog(true)}
            className="min-h-12 rounded-full border border-slate-200/80 bg-blue-600 px-6 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 dark:border-blue-500/30 dark:bg-blue-500 dark:shadow-lg dark:hover:bg-blue-600"
            title="Admin: Auto-answer with target grade %"
          >
            <Zap className="mr-1 h-3.5 w-3.5" />
            Auto Answer
          </Button>
        </div>
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto">
          {!isAnswerSubmitted ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="min-h-12 rounded-full border border-slate-200/80 bg-blue-600 px-8 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500 dark:shadow-lg dark:hover:bg-blue-600"
            >
              Submit
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="min-h-12 rounded-full border border-slate-200/80 bg-blue-600 px-8 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 dark:border-blue-500/30 dark:bg-blue-500 dark:shadow-lg dark:hover:bg-blue-600"
            >
              {currentQuestionIndex === orderedQuestions.length - 1
                ? "Finish"
                : "Next"}
            </Button>
          )}
        </div>
      </div>

      <ReportQuestionDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={currentQuestion?.id}
        subjectId={subjectId}
      />

      {cheatMode && (
        <AdminAutoAnswerDialog
          open={showAutoAnswerDialog}
          onOpenChange={setShowAutoAnswerDialog}
          questions={orderedQuestions}
          mcqOptionCount={mcqOptionCount}
          onApply={handleAdminAutoAnswerApply}
        />
      )}

      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md rounded-2xl border-0 bg-slate-100 shadow-none dark:bg-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-center text-base text-gray-900 dark:text-gray-100">
                Quiz Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {score}/{orderedQuestions.length}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You got {score} question{score !== 1 ? "s" : ""} correct.
                </p>
              </div>
              <Button
                onClick={handleReview}
                size="lg"
                className="h-12 w-full rounded-full border-none bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Review Answers
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
