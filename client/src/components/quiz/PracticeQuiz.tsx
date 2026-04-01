import { useState, useEffect, useRef } from "react";
import { PracticeQuizHeader } from "./PracticeQuizHeader";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";
import { getStudyNoteFromQuestion } from "@/lib/studyNote";
import { Calculator } from "lucide-react";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import { useRouter } from "next/router";
import { PracticeQuizReview } from "./PracticeQuizReview";
import { ReportQuestionDialog } from "./ReportQuestionDialog";
import { ExplanationPanel } from "./ExplanationPanel";
import { CheckCircle, XCircle, LogOut, Flag, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminAutoAnswerDialog } from "./AdminAutoAnswerDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useQuizEngine } from "@/hooks/useQuizEngine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CALCULATOR_SUBJECTS = ["calculus-ab", "calculus-bc", "statistics", "chemistry", "physics-1", "physics-2"];

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
    isLastQuestion,
  } = useQuizEngine({
    initialIndex: 0,
    initialAnswers: {},
    totalQuestions: questions.length,
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [timerHidden, setTimerHidden] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [finalUserAnswers, setFinalUserAnswers] = useState<{ [key: number]: string }>({});
  const [cheatMode, setCheatMode] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showCalculator, setShowCalculator] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showConceptPrimer, setShowConceptPrimer] = useState(false);
  const [primerStepIndex, setPrimerStepIndex] = useState(0);
  const [showAutoAnswerDialog, setShowAutoAnswerDialog] = useState(false);

  const { isAdmin } = useAdminCheck();
  const appliedSavedState = useRef(false);
  const hasSetInitialPrimer = useRef(false);
  // Initialize from saved state when resuming a unit quiz (only once)
  useEffect(() => {
    if (savedState && questions.length > 0 && !appliedSavedState.current) {
      appliedSavedState.current = true;
      const idx = Math.min(savedState.currentQuestionIndex, questions.length - 1);
      setFinalUserAnswers(savedState.userAnswers || {});
      if (savedState.flaggedQuestions && savedState.flaggedQuestions.length > 0) {
        setFlaggedQuestions(new Set(savedState.flaggedQuestions));
      }
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
  const queryClient = useQueryClient();
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;

  const isCalculatorAllowed = CALCULATOR_SUBJECTS.includes(subjectId);

  useEffect(() => {
    const savedCheatMode = localStorage.getItem('adminCheatMode');
    if (savedCheatMode) {
      setCheatMode(savedCheatMode === 'true');
    }
  }, []);

  useEffect(() => {
    const loadBookmarks = async () => {
      if (!user) return;
      try {
        const res = await apiRequest("GET", `/api/user/bookmarks/ids?subjectId=${subjectId}`);
        const data = await res.json();
        if (data.success) {
          setBookmarkedIds(new Set(data.data));
        }
      } catch (e) {
        console.log("Could not load bookmarks");
      }
    };
    loadBookmarks();
  }, [user, subjectId]);

  const handleToggleBookmark = async (question: any) => {
    if (!user) return;
    const qId = question.id;
    const wasBookmarked = bookmarkedIds.has(qId);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(qId);
      else next.add(qId);
      return next;
    });
    try {
      let promptText = question.prompt || '';
      if (!promptText && question.prompt_blocks) {
        promptText = question.prompt_blocks
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.value)
          .join(' ');
      }
      const res = await apiRequest("POST", "/api/user/bookmarks/toggle", {
        questionId: qId,
        subjectId,
        unitId: router.query.unit as string || '',
        prompt: promptText,
        choices: question.choices || [],
        answerIndex: question.answerIndex,
        explanation: question.explanation || '',
        sectionCode: question.section_code || '',
      });
      const data = await res.json();
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (data.data.bookmarked) next.add(qId);
        else next.delete(qId);
        return next;
      });
    } catch (e) {
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(qId);
        else next.delete(qId);
        return next;
      });
    }
  };

  const orderedQuestions = isFullLength ? [...questions].reverse() : questions;
  const currentQuestion = orderedQuestions[currentQuestionIndex];

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
    const correctCount = orderedQuestions.reduce((count, q, idx) => {
      const correctLabel = getDisplayCorrectLabel(q, mcqOptionCount);
      return answers[idx] === correctLabel ? count + 1 : count;
    }, 0);
    setFinalUserAnswers(answers);
    setScore(correctCount);
    setShowResults(true);
    onComplete(correctCount, answers);
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col text-slate-900 dark:text-slate-100">
        <div className="flex-1 flex overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">
              Concepts to know for the next 5 questions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {primerStepIndex + 1} of {chunkQuestions.length}
            </p>
            <div className="w-full rounded-lg border-2 bg-gray-100 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 min-h-[200px] p-6 flex flex-col">
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
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-6 py-2.5 text-white font-medium rounded-xl"
                >
                  I&apos;m ready
                </Button>
              ) : (
                <Button
                  onClick={() => setPrimerStepIndex((i) => Math.min(chunkQuestions.length - 1, i + 1))}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2.5 text-white font-medium rounded-xl"
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col text-slate-900 dark:text-slate-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Desmos Sidebar */}
        {isCalculatorAllowed && showCalculator && (
          <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 flex flex-col z-40">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Desmos Calculator</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCalculator(false)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <iframe
              src="https://www.desmos.com/calculator"
              className="flex-1 w-full"
              title="Desmos Calculator"
            />
          </div>
        )}

        <div className={`flex-1 overflow-y-auto mb-14 pb-1 ${showCalculator ? 'hidden md:block' : 'block'}`}>
          <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-stretch">
              {/* Question: left on desktop, top on narrow screens */}
              <div className="order-1 flex-1 min-w-0">
                <PracticeQuizQuestionCard
                  question={currentQuestion}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={orderedQuestions.length}
                  selectedAnswer={selectedAnswer}
                  onAnswerSelect={handleAnswerSelect}
                  isAnswerSubmitted={isAnswerSubmitted}
                  cheatMode={cheatMode}
                  isBookmarked={bookmarkedIds.has(currentQuestion?.id)}
                  onToggleBookmark={() => handleToggleBookmark(currentQuestion)}
                  mcqOptionCount={mcqOptionCount}
                />
              </div>
              {/* Explanation: right on desktop, below on narrow screens */}
              <div className="order-2 w-full md:w-[35%] md:min-w-0 flex flex-col">
                <ExplanationPanel
                  hasAnswered={isAnswerSubmitted}
                  isCorrect={!!(currentQuestion && selectedAnswer === getDisplayCorrectLabel(currentQuestion, mcqOptionCount))}
                >
                  {isAnswerSubmitted && currentQuestion?.explanation && (
                    <PrettyExplanation>
                      {getDisplayExplanation(currentQuestion.explanation, currentQuestion, mcqOptionCount)}
                    </PrettyExplanation>
                  )}
                </ExplanationPanel>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar — aligned with quiz content (max-w-6xl), Submit/Next in center */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2.5">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {isCalculatorAllowed && (
                <Button
                  variant={showCalculator ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400 shrink-0"
                >
                  <Calculator className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{showCalculator ? "Hide Calculator" : "Show Calculator"}</span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAutoAnswerDialog(true)}
                  className="text-amber-600 border-amber-300 dark:border-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs shrink-0"
                  title="Admin: Auto-answer with target grade %"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Auto-answer
                </Button>
              )}
            </div>
            <div className="flex justify-center items-center flex-shrink-0">
              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl disabled:opacity-50"
                >
                  Submit
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl"
                >
                  {currentQuestionIndex === orderedQuestions.length - 1 ? "Finish" : "Next"}
                </Button>
              )}
            </div>
            <div className="flex justify-end items-center gap-2 flex-1 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReportDialog(true)}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
              >
                <Flag className="w-3.5 h-3.5 mr-1" />
                Report
              </Button>
              {onSaveAndExit ? (
                <Button
                  onClick={() => {
                    onSaveAndExit({
                      questionIds: orderedQuestions.map((q) => q.id),
                      currentQuestionIndex,
                      userAnswers: finalUserAnswers,
                      flaggedQuestions: Array.from(flaggedQuestions),
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs dark:border-red-500 dark:text-red-400"
                >
                  Save & Exit
                </Button>
              ) : (
                <Button
                  onClick={onExit}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs dark:border-red-500 dark:text-red-400"
                >
                  Exit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportQuestionDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={currentQuestion?.id}
        subjectId={subjectId}
      />

      <AdminAutoAnswerDialog
        open={showAutoAnswerDialog}
        onOpenChange={setShowAutoAnswerDialog}
        questions={orderedQuestions}
        mcqOptionCount={mcqOptionCount}
        onApply={handleAdminAutoAnswerApply}
      />

      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
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
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 w-full text-base py-5 text-white border-none"
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
