import { useState, useEffect } from "react";
import { PracticeQuizHeader } from "./PracticeQuizHeader";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Calculator } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/router";
import { PracticeQuizReview } from "./PracticeQuizReview";
import { CheckCircle, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
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
  choices: string[];
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
  prompt_blocks?: any[];
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
  const [generatedExplanations, setGeneratedExplanations] = useState<
    Map<number, string>
  >(new Map());
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
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

  // Reverse the questions array to show the newest test first if it's a full-length test
  const orderedQuestions = isFullLength ? [...questions].reverse() : questions;
  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const currentExplanation =
    generatedExplanations.get(currentQuestionIndex) ||
    currentQuestion?.explanation;

  useEffect(() => {
    const generateExplanationIfNeeded = async () => {
      if (!currentQuestion || !isAnswerSubmitted) return;

      const hasExplanation =
        currentQuestion.explanation &&
        currentQuestion.explanation.trim() !== "";
      const alreadyGenerated = generatedExplanations.has(currentQuestionIndex);

      if (!hasExplanation && !alreadyGenerated && !isGeneratingExplanation) {
        setIsGeneratingExplanation(true);
        try {
          const response = await apiRequest(
            "POST",
            "/api/generateExplanationOnTheGo",
            {
              questionPrompt: currentQuestion.prompt,
              choices: currentQuestion.choices,
              correctAnswerIndex: currentQuestion.answerIndex,
            },
          );

          if (response.ok) {
            const data = await response.json();
            setGeneratedExplanations((prev) =>
              new Map(prev).set(currentQuestionIndex, data.explanation),
            );
          }
        } catch (error) {
          console.error("Error generating explanation:", error);
        } finally {
          setIsGeneratingExplanation(false);
        }
      }
    };

    generateExplanationIfNeeded();
  }, [
    currentQuestion,
    currentQuestionIndex,
    isAnswerSubmitted,
    generatedExplanations,
    isGeneratingExplanation,
  ]);

  const handleAnswerSelect = (answer: string) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const ns = new Set(prev);
      if (ns.has(currentQuestionIndex)) ns.delete(currentQuestionIndex);
      else ns.add(currentQuestionIndex);
      return ns;
    });
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    setIsAnswerSubmitted(true);

    // Save the answer
    setFinalUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: selectedAnswer,
    }));

    const correctLabel = String.fromCharCode(65 + currentQuestion.answerIndex);
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

    // Only track progress for unit-wise practice (not full-length tests)
    if (!isFullLength) {
      // Extract unit from question ID (e.g., "APMACRO_BEC_Q1" -> "BEC")
      const unit = currentQuestion.id.split("_")[1];

      // Count total questions and correct answers for this unit
      const unitQuestions = orderedQuestions.filter(
        (q) => q.id.split("_")[1] === unit,
      );
      const unitQuestionsCount = unitQuestions.length;

      // Count how many of this unit's questions have been answered
      const answeredUnitQuestions =
        Object.keys(finalUserAnswers).filter((index) => {
          const question = orderedQuestions[parseInt(index)];
          return question && question.id.split("_")[1] === unit;
        }).length + 1; // +1 for the current questioneing submitted

      // Count correct answers for this unit
      let correctCount = 0;
      Object.entries(finalUserAnswers).forEach(([index, answer]) => {
        const question = orderedQuestions[parseInt(index)];
        if (question && question.id.split("_")[1] === unit) {
          const correctLabel = String.fromCharCode(65 + question.answerIndex);
          if (answer === correctLabel) correctCount++;
        }
      });
      // Add current answer if correct
      if (isCorrect) correctCount++;

      // Calculate percentage based on answered questions so far
      const percentage = Math.round(
        (correctCount / answeredUnitQuestions) * 100,
      );

      // Save the unit progress
      apiRequest("PUT", `/api/user/subjects/${subjectId}/unit-progress`, {
        unitId: unit,
        mcqScore: percentage,
      })
        .then((response) => {
          if (response.ok) {
            response.json().then(() => {
              // Trigger a refetch of subjects data by dispatching a custom event
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
      // For full-length tests, navigate directly to results page
      if (isFullLength && lastSavedTestId) {
        router.push(
          `/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`,
        );
      } else {
        setShowResults(true); // Show results modal for practice quizzes only
      }
    }
  };

  const handleReview = () => {
    if (isFullLength && lastSavedTestId) {
      // Navigate to the full-length-results page
      router.push(
        `/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`,
      );
    } else {
      // For practice quizzes, open review mode
      setShowResults(false);
      setIsReviewMode(true);
    }
  };

  const handleCloseReview = () => {
    setIsReviewMode(false);
    // Don't save, just exit
    onExit();
  };

  // Render review mode if active
  if (isReviewMode) {
    return (
      <PracticeQuizReview
        questions={orderedQuestions}
        userAnswers={finalUserAnswers}
        onClose={handleCloseReview}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Desmos Sidebar */}
        {isCalculatorAllowed && showCalculator && (
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col hidden md:flex">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold dark:text-gray-100">Desmos Calculator</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCalculator(false)}
                className="h-8 w-8 p-0"
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

        <div className="flex-1 overflow-y-auto mb-16 pb-2">
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
            />

            {isAnswerSubmitted && (
              <Card className="border-khan-blue bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm dark:text-gray-100">Explanation</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  {isGeneratingExplanation ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-khan-blue mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Generating explanation...
                      </span>
                    </div>
                  ) : currentExplanation ? (
                    <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentExplanation}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <div className="flex flex-1 items-center">
              {isCalculatorAllowed && (
                <>
                  {/* Desktop Toggle */}
                  <Button
                    variant={showCalculator ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="hidden md:flex border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculator
                  </Button>

                  {/* Mobile Dialog */}
                  <div className="md:hidden">
                    <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400"
                        >
                          <Calculator className="w-4 h-4 mr-2" />
                          Calculator
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[80vh] p-0 dark:bg-gray-900 dark:border-gray-800">
                        <DialogHeader className="p-4 border-b dark:border-gray-800">
                          <DialogTitle className="dark:text-gray-100">Desmos Graphing Calculator</DialogTitle>
                        </DialogHeader>
                        <iframe
                          src="https://www.desmos.com/calculator"
                          className="w-full h-full"
                          title="Desmos Calculator"
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center items-center gap-2 sm:gap-4 flex-1 sm:flex-none">
              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 text-sm sm:text-base h-10 sm:h-10 text-white"
                >
                  Submit
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 text-sm sm:text-base h-10 sm:h-10 text-white"
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
                className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm dark:border-red-400 dark:text-red-400"
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary (Conditionally Rendered) */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-center dark:text-gray-100">Quiz Complete!</CardTitle>
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
                className="bg-blue-600 hover:bg-blue-700 w-full text-lg py-6 text-white"
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
