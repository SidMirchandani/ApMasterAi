import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { QuizHeader } from "./QuizHeader";
import { QuestionCard } from "./QuestionCard";
import { TestFloatingNav } from "./TestFloatingNav";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { QuizReviewPage } from "./QuizReviewPage";
import { ReportQuestionDialog } from "./ReportQuestionDialog";
import { AdminAutoAnswerDialog } from "./AdminAutoAnswerDialog";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import { getSubjectByLegacyId, getSubjectByCode, getApiCodeForSubject, getUnitIdForSectionCode } from '@/subjects';
import { getDisplayCorrectLabel, getStoredAnswerForSubmit } from '@/lib/mcqDisplay';
import { getSubjectDisplayName } from '../../../../lib/subject-display-names';
import { useQuizEngine } from "@/hooks/useQuizEngine";
import type { Question } from "@/lib/types/question";
import { getAnalyticsPageParams, trackVersionedAnalyticsEvent } from "@/lib/firebase";
interface FullLengthQuizProps {
  questions: Question[];
  subjectId: string;
  timeElapsed: number;
  onExit: () => void;
  onSubmit: (answers?: { [key: number]: string }) => void;
  savedState?: any;
  examConfig?: { questions: number; timeMinutes: number } | null;
  hasAppNav?: boolean;
}

export function FullLengthQuiz({ questions, subjectId, timeElapsed, onExit, onSubmit, savedState, examConfig, hasAppNav }: FullLengthQuizProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const {
    currentQuestionIndex,
    userAnswers,
    flaggedQuestions,
    setAnswer,
    next,
    previous,
    goTo,
    toggleFlag,
  } = useQuizEngine({
    initialIndex: savedState?.currentQuestionIndex || 0,
    initialAnswers: savedState?.userAnswers || {},
    initialFlagged: savedState?.flaggedQuestions || [],
    totalQuestions: questions.length,
  });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(() => {
    // If we have saved state with time remaining, use that
    if (savedState?.timeRemaining !== undefined) {
      return savedState.timeRemaining;
    }
    // Otherwise, calculate total time from exam config
    if (!examConfig) {
      console.error('No exam config found for subject:', subjectId);
      return 90 * 60; // Fallback to 90 minutes only if config is missing
    }
    const totalSeconds = examConfig.timeMinutes * 60;
    console.log('Timer initialized:', { subject: subjectId, minutes: examConfig.timeMinutes, seconds: totalSeconds });
    return totalSeconds;
  });
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [cheatMode, setCheatMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showAutoAnswerDialog, setShowAutoAnswerDialog] = useState(false);

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

  // Countdown timer effect
  useEffect(() => {
    if (isReviewMode || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }

        // Show warning at 10 minutes (600 seconds)
        if (prev === 600 && !showTimeWarning) {
          setShowTimeWarning(true);
          setTimeout(() => setShowTimeWarning(false), 5000); // Hide after 5 seconds
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isReviewMode, isSubmitting]);

  const currentQuestion = questions[currentQuestionIndex];
  const getQuizAnalyticsParams = () =>
    getAnalyticsPageParams({
      surface: "quiz",
      subject: subjectId,
      unit: "full-length",
    });

  const handleExitExam = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    const examState = {
      currentQuestionIndex,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      timeElapsed,
      timeRemaining,
      questionIds: questions.map((q: any) => q.id),
    };

    try {
      await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/save-exam-state`,
        { examState }
      );
    } catch (error) {
      console.error("Failed to save exam state:", error);
    }
    setShowExitDialog(false);
    onExit();
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswer(currentQuestionIndex, answer);
  };

  // Updated handleSubmitTest to format question data correctly. Optional overrideAnswers for admin auto-answer.
  const handleSubmitTest = async (overrideAnswers?: { [key: number]: string }) => {
    setShowSubmitConfirm(false);
    setIsSubmitting(true);
    const answersToUse = overrideAnswers ?? userAnswers;

    try {
      const correctCount = questions.reduce((count, question, index) => {
        const userAnswer = answersToUse[index];
        const displayCorrectLabel = getDisplayCorrectLabel(question, mcqOptionCount);
        return userAnswer === displayCorrectLabel ? count + 1 : count;
      }, 0);

      const percentage = Math.round((correctCount / questions.length) * 100);

      const formattedQuestions = normalizeQuestions(questions);

      // Map display answers to stored (E) for 4-option subjects when we showed E as D
      const storedUserAnswers: { [key: number]: string } = {};
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const displaySel = answersToUse[i];
        storedUserAnswers[i] = getStoredAnswerForSubmit(displaySel ?? "", q, mcqOptionCount);
      }

      const response = await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/full-length-test`,
        {
          score: correctCount,
          percentage: percentage,
          totalQuestions: questions.length,
          questions: formattedQuestions,
          userAnswers: storedUserAnswers
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit test: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      const testId = result.data.id;

      void trackVersionedAnalyticsEvent({
        action: "quiz_taken",
        params: getQuizAnalyticsParams(),
      });

      // Invalidate and refetch so study/dashboard show updated data when user navigates back
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/analytics", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/score-history", subjectId] });
      await queryClient.refetchQueries({ queryKey: ["subjects"] });
      await queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] });

      await apiRequest(
        "DELETE",
        `/api/user/subjects/${subjectId}/delete-exam-state`
      );

      // Save wrong answers per unit with unit info so they appear in Review for that unit (await before redirect)
      const trackPromises: Promise<unknown>[] = [];
        questions.forEach((q, idx) => {
        const displayCorrect = getDisplayCorrectLabel(q, mcqOptionCount);
        const userAns = answersToUse[idx];
        const isCorrect = userAns === displayCorrect;
        if (!isCorrect && q.id) {
          const sectionCode = (q as any).section_code || "";
          const unitId = getUnitIdForSectionCode(subjectId, sectionCode) || sectionCode || "unknown";
          trackPromises.push(
            apiRequest("POST", "/api/user/questions/track", {
              questionId: q.id,
              subjectId,
              unitId,
              correct: false,
              timeSpentSec: 0,
              sectionCode,
            })
          );
        }
      });
      await Promise.all(trackPromises);

      queryClient.invalidateQueries({ queryKey: ["dueReviews", subjectId, "all"] });
      router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
    } catch (error) {
      console.error("Error submitting test:", error);
      setIsSubmitting(false);
      // Optionally, show an error message to the user
    }
  };

  const handleReviewSubmit = (updatedAnswers: { [key: number]: string }, _updatedFlagged: Set<number>) => {
    // Pass review edits directly — engine state has no bulk setters, and setState would not
    // apply before submit anyway.
    handleSubmitTest(updatedAnswers);
  };

  // Added logic for review mode rendering
  if (isReviewMode) {
    return (
      <QuizReviewPage
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onBack={() => {
          setIsReviewMode(false);
        }}
        onSubmit={handleReviewSubmit}
        subjectId={subjectId}
        isSubmitting={isSubmitting}
        hasAppNav={hasAppNav}
      />
    );
  }

  // Function to render image if URLs are present
  const renderImage = (urls: string[] | undefined) => {
    if (!urls || urls.length === 0) {
      return null;
    }
    return urls.map((url, index) => <img key={index} src={url} alt={`Image ${index + 1}`} className="mb-4 h-auto max-w-full rounded-lg" />);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
      <div
        className={`fixed left-0 right-0 z-50 ${
          hasAppNav ? "top-[calc(3.75rem+1px)]" : "top-0"
        }`}
      >
        <QuizHeader
          title={`${getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId)} Full-Length MCQ Test`}
          timeElapsed={timeElapsed}
          timeRemaining={timeRemaining}
          onHideTimer={() => setTimerHidden(!timerHidden)}
          timerHidden={timerHidden}
          onExitExam={handleExitExam}
          subjectId={subjectId}
          headerVariant="default"
          useBlueDashedDivider
        />
      </div>

      {/* Time warning overlay */}
      {showTimeWarning && (
        <div
          className={`fixed left-1/2 z-50 -translate-x-1/2 transform animate-pulse rounded-xl bg-blue-600 px-6 py-3 text-white dark:bg-blue-500 ${
            hasAppNav
              ? "top-[calc(3.75rem+1px+4rem+0.5rem)] max-md:top-[calc(3.75rem+1px+4.875rem+0.5rem)]"
              : "top-20"
          }`}
        >
          <p className="font-semibold">⏰ 10 minutes remaining!</p>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] sm:pb-32 ${
          hasAppNav
            ? "pt-[calc(3.75rem+1px+3.25rem+1px)] max-md:pt-[calc(3.75rem+1px+4.25rem+1px)]"
            : "pt-[calc(3.25rem+1px)] max-md:pt-[calc(4.25rem+1px)]"
        }`}
      >
        <div className="mx-auto min-w-0 max-w-3xl px-2 pb-3 pt-0 sm:px-3">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={userAnswers[currentQuestionIndex]}
            isFlagged={flaggedQuestions.has(currentQuestionIndex)}
            onAnswerSelect={handleAnswerSelect}
            onToggleFlag={() => toggleFlag(currentQuestionIndex)}
            isFullLength={true}
            cheatMode={cheatMode}
            mcqOptionCount={mcqOptionCount}
            examSurfaceVariant="apclassroom"
            onReportError={() => setShowReportDialog(true)}
          />
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

      <TestFloatingNav
        currentIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        canGoPrevious={currentQuestionIndex > 0}
        canGoNext={currentQuestionIndex < questions.length - 1}
        onPrevious={previous}
        onNext={next}
        onGoTo={goTo}
        onEndReview={
          currentQuestionIndex === questions.length - 1
            ? () => setIsReviewMode(true)
            : undefined
        }
      />

      {cheatMode && (
        <AdminAutoAnswerDialog
          open={showAutoAnswerDialog}
          onOpenChange={setShowAutoAnswerDialog}
          questions={questions}
          mcqOptionCount={mcqOptionCount}
          onApply={(answers) => {
            if (!cheatMode) return;
            handleSubmitTest(answers);
          }}
        />
      )}

      <ReportQuestionDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={currentQuestion?.id}
        subjectId={subjectId}
      />

      <SubmitConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmitTest}
      />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit the Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved and you can continue this exam later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Save and Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
