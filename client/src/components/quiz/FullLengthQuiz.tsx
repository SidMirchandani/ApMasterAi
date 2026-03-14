import { useState, useEffect } from "react";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";
import { QuestionCard } from "./QuestionCard";
import { EnhancedQuestionPalette } from "./EnhancedQuestionPalette";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { QuizReviewPage } from "./QuizReviewPage";
import { ReportQuestionDialog } from "./ReportQuestionDialog";
import { AdminAutoAnswerDialog } from "./AdminAutoAnswerDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import { getSubjectByLegacyId, getSubjectByCode, getApiCodeForSubject, getUnitIdForSectionCode } from '@/subjects';
import { getDisplayCorrectLabel, getStoredAnswerForSubmit } from '@/lib/mcqDisplay';
import { getSubjectDisplayName } from '../../../../lib/subject-display-names';

interface Question {
  id: string;
  prompt: string; // Keep prompt for backward compatibility or simpler questions
  choices: string[] | { [key: string]: string[] }; // Allow for object structure too
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
  prompt_blocks?: any[]; // Add prompt_blocks for complex prompts
}

interface FullLengthQuizProps {
  questions: Question[];
  subjectId: string;
  timeElapsed: number;
  onExit: () => void;
  onSubmit: (answers?: { [key: number]: string }) => void;
  onSaveAndExit: (state: any) => void;
  savedState?: any;
  examConfig?: { questions: number; timeMinutes: number } | null;
  hasAppNav?: boolean;
}

export function FullLengthQuiz({ questions, subjectId, timeElapsed, onExit, onSubmit, onSaveAndExit, savedState, examConfig, hasAppNav }: FullLengthQuizProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedState?.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>(savedState?.userAnswers || {});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set(savedState?.flaggedQuestions || []));
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
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
  const { isAdmin } = useAdminCheck();

  useEffect(() => {
    const savedCheatMode = localStorage.getItem('adminCheatMode');
    if (savedCheatMode) {
      setCheatMode(savedCheatMode === 'true');
    }
  }, []);

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

  // Subject-specific directions
  const getExamDirections = () => {
    const subjectKey = subjectId?.toString().toLowerCase();

    const getExamInfo = (subjectKey: string) => {
      const subject = getSubjectByLegacyId(subjectKey);

      if (!subject) {
        return {
          title: 'AP® Practice Exam',
          sections: [
            {
              title: 'General Instructions',
              details: `This practice exam has ${questions.length} multiple-choice questions`,
              description: 'Each question has four suggested answers. Select the best answer for each question.'
            }
          ]
        };
      }

      return {
        title: subject.metadata.examTitle || `${subject.displayName} Practice Exam`,
        sections: subject.metadata.examSections || [],
        breakdown: subject.metadata.breakdown || []
      };
    };

    return getExamInfo(subjectKey); // Call getExamInfo here
  };

  const examDirections = getExamDirections();

  const currentQuestion = questions[currentQuestionIndex];

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
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
      await queryClient.refetchQueries({ queryKey: ["subjects"] });
      await queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] });
      router.push(`/study?subject=${subjectId}`);
    } catch (error) {
      console.error("Failed to save exam state:", error);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
      await queryClient.refetchQueries({ queryKey: ["subjects"] });
      await queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] });
      router.push(`/study?subject=${subjectId}`);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answer }));
  };

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
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

  const handleReviewSubmit = (updatedAnswers: { [key: number]: string }, updatedFlagged: Set<number>) => {
    // Update local state first
    setUserAnswers(updatedAnswers);
    setFlaggedQuestions(updatedFlagged);
    // Directly call submit handler
    handleSubmitTest();
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
      />
    );
  }

  // Function to render image if URLs are present
  const renderImage = (urls: string[] | undefined) => {
    if (!urls || urls.length === 0) {
      return null;
    }
    return urls.map((url, index) => <img key={index} src={url} alt={`Image ${index + 1}`} className="max-w-full h-auto mb-4 rounded-lg shadow-md" />);
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col">
      <div className={`fixed left-0 right-0 z-50 ${hasAppNav ? "top-[4.25rem]" : "top-0"}`}>
        <QuizHeader
          title={`${getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId)} Full Length MCQ Test`}
          timeElapsed={timeElapsed}
          timeRemaining={timeRemaining}
          onHideTimer={() => setTimerHidden(!timerHidden)}
          timerHidden={timerHidden}
          onExitExam={handleExitExam}
          examDirections={examDirections}
          subjectId={subjectId}
        />
      </div>

      {/* Time warning overlay */}
      {showTimeWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-xl shadow-lg animate-pulse">
          <p className="font-semibold">⏰ 10 minutes remaining!</p>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto mb-14 ${hasAppNav ? "mt-[8.25rem]" : "mt-16 md:mt-16"}`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={userAnswers[currentQuestionIndex]}
            isFlagged={flaggedQuestions.has(currentQuestionIndex)}
            onAnswerSelect={handleAnswerSelect}
            onToggleFlag={toggleFlag}
            isFullLength={true}
            cheatMode={cheatMode}
            mcqOptionCount={mcqOptionCount}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <QuizBottomBar
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onOpenPalette={() => setShowQuestionPalette(true)}
          onPrevious={handlePreviousQuestion}
          onNext={handleNextQuestion}
          canGoPrevious={currentQuestionIndex > 0}
          canGoNext={currentQuestionIndex < questions.length - 1}
          isLastQuestion={currentQuestionIndex === questions.length - 1}
          onSubmit={() => handleSubmitTest()}
          onReview={currentQuestionIndex === questions.length - 1 ? () => setIsReviewMode(true) : undefined}
          onSaveAndExit={handleExitExam}
          onReportError={() => setShowReportDialog(true)}
          onAdminAutoAnswer={isAdmin ? () => setShowAutoAnswerDialog(true) : undefined}
          subjectId={subjectId}
        />
      </div>

      <AdminAutoAnswerDialog
        open={showAutoAnswerDialog}
        onOpenChange={setShowAutoAnswerDialog}
        questions={questions}
        mcqOptionCount={mcqOptionCount}
        onApply={(answers) => handleSubmitTest(answers)}
      />

      <ReportQuestionDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={currentQuestion?.id}
        subjectId={subjectId}
      />

      <EnhancedQuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        currentQuestion={currentQuestionIndex}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onQuestionSelect={(index) => {
          setCurrentQuestionIndex(index);
          setShowQuestionPalette(false);
        }}
        onGoToReview={() => {
          setIsReviewMode(true);
          setShowQuestionPalette(false);
        }}
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