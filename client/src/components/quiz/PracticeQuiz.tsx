import { useState, useEffect } from "react";
import { PracticeQuizHeader } from "./PracticeQuizHeader";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";
import { Calculator } from "lucide-react";
import { ExplanationMarkdown } from "@/components/ui/ExplanationMarkdown";
import { useRouter } from "next/router";
import { PracticeQuizReview } from "./PracticeQuizReview";
import { CheckCircle, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
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
}

interface PracticeQuizProps {
  questions: Question[];
  subjectId: string;
  timeElapsed: number;
  onExit: () => void;
  onComplete: (score: number) => void;
  isFullLength?: boolean;
  lastSavedTestId?: string;
}

export function PracticeQuiz({
  questions,
  subjectId,
  timeElapsed,
  onExit,
  onComplete,
  isFullLength = false,
  lastSavedTestId,
}: PracticeQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [timerHidden, setTimerHidden] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [finalUserAnswers, setFinalUserAnswers] = useState<{
    [key: number]: string;
  }>({});
  const [cheatMode, setCheatMode] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showCalculator, setShowCalculator] = useState(false);

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

    if (!isFullLength) {
      const unit = currentQuestion.id.split("_")[1];
      const answeredUnitQuestions =
        Object.keys(finalUserAnswers).filter((index) => {
          const question = orderedQuestions[parseInt(index)];
          return question && question.id.split("_")[1] === unit;
        }).length + 1;

      let correctCount = 0;
      Object.entries(finalUserAnswers).forEach(([index, answer]) => {
        const question = orderedQuestions[parseInt(index)];
        if (question && question.id.split("_")[1] === unit) {
          const correctLabel = getDisplayCorrectLabel(question, mcqOptionCount);
          if (answer === correctLabel) correctCount++;
        }
      });
      if (isCorrect) correctCount++;

      const percentage = Math.round(
        (correctCount / answeredUnitQuestions) * 100,
      );

      apiRequest("PUT", `/api/user/subjects/${subjectId}/unit-progress`, {
        unitId: unit,
        mcqScore: percentage,
      })
        .then((response) => {
          if (response.ok) {
            response.json().then(() => {
              queryClient.invalidateQueries({ queryKey: ["subjects"] });
              queryClient.invalidateQueries({ queryKey: ["/api/user/analytics", subjectId] });
              window.dispatchEvent(new CustomEvent("subjectsUpdated"));
            });
          }
        })
        .catch((error) => {
          console.error("Error saving unit progress:", error);
        });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      if (isFullLength && lastSavedTestId) {
        router.push(
          `/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`,
        );
      } else {
        setShowResults(true);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Desmos Sidebar */}
        {isCalculatorAllowed && showCalculator && (
          <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col z-40">
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

        <div className={`flex-1 overflow-y-auto mb-16 pb-2 ${showCalculator ? 'hidden md:block' : 'block'}`}>
          <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 space-y-2">
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

            {isAnswerSubmitted && currentQuestion?.explanation && (() => {
              const explanationCorrect = selectedAnswer === getDisplayCorrectLabel(currentQuestion, mcqOptionCount);
              return (
                <Card className={
                  explanationCorrect
                    ? "border-emerald-500 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20"
                    : "border-red-500 dark:border-red-600 bg-red-50/50 dark:bg-red-900/20"
                }>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className={`text-sm ${explanationCorrect ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
                      {explanationCorrect ? "Correct — Explanation" : "Incorrect — Explanation"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <ExplanationMarkdown>
                      {getDisplayExplanation(currentQuestion.explanation, currentQuestion, mcqOptionCount)}
                    </ExplanationMarkdown>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <div className="flex flex-1 items-center">
              {isCalculatorAllowed && (
                <Button
                  variant={showCalculator ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {showCalculator ? "Hide Calculator" : "Show Calculator"}
                </Button>
              )}
            </div>
            <div className="flex justify-center items-center gap-2 sm:gap-4 flex-1 sm:flex-none">
              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 sm:px-8 text-sm sm:text-base h-10 sm:h-10 text-white border-none shadow-none"
                >
                  Submit
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 sm:px-8 text-sm sm:text-base h-10 sm:h-10 text-white border-none shadow-none"
                >
                  {currentQuestionIndex === orderedQuestions.length - 1
                    ? "Finish"
                    : "Next"}
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={onExit}
                variant="outline"
                size="sm"
                className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm dark:border-red-500 dark:text-red-400"
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-center text-gray-900 dark:text-gray-100">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {score}/{orderedQuestions.length}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  You got {score} question{score !== 1 ? "s" : ""} correct.
                </p>
              </div>
              <Button
                onClick={handleReview}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 w-full text-lg py-6 text-white border-none"
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
