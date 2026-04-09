import { useState, useEffect, useRef } from "react";
import { PracticeQuizHeader } from "./PracticeQuizHeader";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";
import { getStudyNoteFromQuestion } from "@/lib/studyNote";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import { useRouter } from "next/router";
import { PracticeQuizReview } from "./PracticeQuizReview";
import { ReportQuestionDialog } from "./ReportQuestionDialog";
import { ExplanationPanel } from "./ExplanationPanel";
import { Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AdminAutoAnswerDialog } from "./AdminAutoAnswerDialog";
import { useQuizEngine } from "@/hooks/useQuizEngine";
import { showPracticeExamToolHeader } from "@/lib/examTools";

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
}: PracticeQuizProps) {
  const {
    currentQuestionIndex,
    userAnswers,
    setAnswer,
    next,
  } = useQuizEngine({
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
  const [finalUserAnswers, setFinalUserAnswers] = useState<{ [key: number]: string }>({});
  const [cheatMode, setCheatMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showConceptPrimer, setShowConceptPrimer] = useState(false);
  const [primerStepIndex, setPrimerStepIndex] = useState(0);
  const [showAutoAnswerDialog, setShowAutoAnswerDialog] = useState(false);

  const appliedSavedState = useRef(false);
  const hasSetInitialPrimer = useRef(false);
  // Initialize from saved state when resuming a unit quiz (only once)
  useEffect(() => {
    if (savedState && questions.length > 0 && !appliedSavedState.current) {
      appliedSavedState.current = true;
      const idx = Math.min(savedState.currentQuestionIndex, questions.length - 1);
      setFinalUserAnswers(savedState.userAnswers || {});
      if (enableStudyNotesPrimer && idx % 5 === 0) {
        setShowConceptPrimer(true);
      }
    }
  }, [savedState, questions.length, enableStudyNotesPrimer]);
  // Show concept primer on fresh start (no saved state) when primer is enabled
  useEffect(() => {
    if (enableStudyNotesPrimer && questions.length > 0 && !savedState && !hasSetInitialPrimer.current) {
      hasSetInitialPrimer.current = true;
      setShowConceptPrimer(true);
    }
  }, [enableStudyNotesPrimer, questions.length, savedState]);

  // Reset primer step when opening the primer (e.g. new chunk of 5)
  useEffect(() => {
    if (showConceptPrimer) setPrimerStepIndex(0);
  }, [showConceptPrimer]);

  const router = useRouter();
  const { user } = useAuth();
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;

  const showToolHeader = showPracticeExamToolHeader(subjectId);

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
      window.removeEventListener("admin-cheat-mode-changed", onCheatModeChanged);
    };
  }, []);

  useEffect(() => {
    if (!cheatMode) {
      setShowAutoAnswerDialog(false);
    }
  }, [cheatMode]);

  const orderedQuestions = isFullLength ? [...questions].reverse() : questions;
  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const feedbackCorrectLabel = currentQuestion
    ? getDisplayCorrectLabel(currentQuestion, mcqOptionCount)
    : "";
  const isCurrentAnswerCorrect =
    isAnswerSubmitted && !!selectedAnswer && selectedAnswer === feedbackCorrectLabel;

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

    const correctLabel = getDisplayCorrectLabel(currentQuestion, mcqOptionCount);
    const isCorrect = selectedAnswer === correctLabel;
    if (isCorrect) setScore((s) => s + 1);

    if (user) {
      apiRequest("POST", "/api/user/questions/track", {
        questionId: currentQuestion.id,
        subjectId,
        unitId: currentQuestion.id.split("_")[1] || '',
        correct: isCorrect,
        timeSpentSec: 0,
        sectionCode: currentQuestion.section_code || '',
        prompt: currentQuestion.prompt || (currentQuestion.prompt_blocks ? currentQuestion.prompt_blocks.filter((b: any) => b.type === 'text').map((b: any) => b.value).join(' ') : ''),
        choices: currentQuestion.choices,
        answerIndex: currentQuestion.answerIndex,
        explanation: currentQuestion.explanation || '',
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
      if (enableStudyNotesPrimer && nextIndex % 5 === 0) {
        setShowConceptPrimer(true);
      }
    } else {
      if (isFullLength && lastSavedTestId) {
        router.push(`/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`);
      } else {
        setShowResults(true);
        const answersWithLast = { ...finalUserAnswers, [currentQuestionIndex]: selectedAnswer ?? "" };
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

  const CHUNK_SIZE = 5;
  const chunkIndex = Math.floor(currentQuestionIndex / CHUNK_SIZE);
  const chunkQuestions = orderedQuestions.slice(
    chunkIndex * CHUNK_SIZE,
    chunkIndex * CHUNK_SIZE + CHUNK_SIZE
  );

  if (showConceptPrimer && enableStudyNotesPrimer && chunkQuestions.length > 0) {
    const currentPrimerQuestion = chunkQuestions[primerStepIndex];
    const note = currentPrimerQuestion ? getStudyNoteFromQuestion(currentPrimerQuestion) : "";
    const isLastStep = primerStepIndex >= chunkQuestions.length - 1;
    const isFirstStep = primerStepIndex === 0;

    // DEBUG: log test_slug and study note for all primer questions (open browser DevTools → Console)
    if (typeof window !== "undefined") {
      console.log("[Study Notes Primer DEBUG] chunkQuestions:", chunkQuestions.map((q, i) => ({
        index: i,
        id: q.id,
        test_slug: q.test_slug,
        test_slug_type: typeof q.test_slug,
        test_slug_length: (q.test_slug && String(q.test_slug).length) || 0,
        tags: q.tags,
        extractedNote: getStudyNoteFromQuestion(q),
        extractedNote_length: getStudyNoteFromQuestion(q).length,
      })));
      console.log("[Study Notes Primer DEBUG] current step:", primerStepIndex, "current question test_slug:", currentPrimerQuestion?.test_slug, "note length:", note.length);
    }

    return (
      <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
        <div className="flex flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">
              Concepts to know for the next 5 questions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {primerStepIndex + 1} of {chunkQuestions.length}
            </p>
            <div className="flex min-h-[200px] w-full flex-col rounded-2xl bg-slate-100 p-6 dark:bg-white/[0.06]">
              <div className="text-sm text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none flex-1">
                {note ? (
                  <PrettyExplanation className="text-sm">
                    {note}
                  </PrettyExplanation>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 italic">
                    No study note for this question.
                  </span>
                )}
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3 w-full max-w-sm justify-between">
              <Button
                variant="outline"
                onClick={() => setPrimerStepIndex((i) => Math.max(0, i - 1))}
                disabled={isFirstStep}
                className="px-5 py-2.5 border-slate-300 dark:border-slate-600"
              >
                Previous
              </Button>
              {isLastStep ? (
                <Button
                  onClick={() => {
                    setShowConceptPrimer(false);
                    setPrimerStepIndex(0);
                  }}
                  className="rounded-full bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  I&apos;m ready
                </Button>
              ) : (
                <Button
                  onClick={() => setPrimerStepIndex((i) => Math.min(chunkQuestions.length - 1, i + 1))}
                  className="rounded-full bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
      {showToolHeader && (
        <div className="fixed left-0 right-0 top-[calc(3.75rem+1px)] z-40">
          <PracticeQuizHeader
            title={`${subject?.displayName ?? "Practice"} — Practice Quiz`}
            subjectId={subjectId}
            onExitExam={handleHeaderExit}
          />
        </div>
      )}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          showToolHeader
            ? "pt-[calc(3.75rem+1px+3.25rem+1px)] max-md:pt-[calc(3.75rem+1px+4.25rem+1px)]"
            : ""
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pb-32">
          <div className={`mx-auto max-w-6xl px-2 sm:px-3 ${showToolHeader ? "pb-1 pt-0" : "py-2"}`}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_360px]">
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
              <div className={`md:sticky md:top-4 ${isAnswerSubmitted ? "md:self-start" : "md:self-stretch"}`}>
                <ExplanationPanel
                  hasAnswered={isAnswerSubmitted}
                  isCorrect={isCurrentAnswerCorrect}
                  className={isAnswerSubmitted ? "" : "h-full"}
                >
                  {isAnswerSubmitted && currentQuestion && (
                    <>
                      <p className="text-sm font-medium">
                        {selectedAnswer === feedbackCorrectLabel
                          ? "Correct."
                          : `Incorrect. The correct answer is ${feedbackCorrectLabel}.`}
                      </p>
                      {currentQuestion.explanation ? (
                        <PrettyExplanation className="prose prose-sm dark:prose-invert max-w-none">
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
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
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
              {currentQuestionIndex === orderedQuestions.length - 1 ? "Finish" : "Next"}
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
              <CardTitle className="text-center text-base text-gray-900 dark:text-gray-100">Quiz Complete!</CardTitle>
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
