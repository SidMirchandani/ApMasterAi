import { useState, useEffect } from "react";
import { PracticeQuizHeader } from "./PracticeQuizHeader";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/router";
import { PracticeQuizReview } from "./PracticeQuizReview";
import { CheckCircle, XCircle, LogOut } from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
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

  const router = useRouter();

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

    console.log(`🔍 [PracticeQuiz] handleSubmitAnswer called:`, {
      questionId: currentQuestion.id,
      questionIndex: currentQuestionIndex,
      selectedAnswer,
      isFullLength,
      subjectId,
    });

    // Save the answer
    setFinalUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: selectedAnswer,
    }));

    const correctLabel = String.fromCharCode(65 + currentQuestion.answerIndex);
    const isCorrect = selectedAnswer === correctLabel;
    if (isCorrect) setScore((s) => s + 1);

    console.log(`✓ [PracticeQuiz] Answer checked:`, {
      selectedAnswer,
      correctLabel,
      isCorrect,
    });

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

      console.log(`📊 [PracticeQuiz] Answered unit questions count:`, {
        answeredSoFar: answeredUnitQuestions - 1,
        currentAnswer: 1,
        total: answeredUnitQuestions,
        finalUserAnswers: Object.keys(finalUserAnswers).length,
      });

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

      console.log(`✅ [PracticeQuiz] Correct answers count:`, {
        correctFromPrevious: correctCount - (isCorrect ? 1 : 0),
        currentCorrect: isCorrect ? 1 : 0,
        totalCorrect: correctCount,
      });

      // Calculate percentage based on answered questions so far
      const percentage = Math.round(
        (correctCount / answeredUnitQuestions) * 100,
      );

      console.log(`🎯 [PracticeQuiz] Calculated percentage:`, {
        correctCount,
        answeredUnitQuestions,
        percentage,
        calculation: `${correctCount}/${answeredUnitQuestions} = ${percentage}%`,
      });

      console.log(
        `📊 [PracticeQuiz] Saving unit progress for subject=${subjectId}, unit=${unit}, score=${percentage}% (${correctCount}/${answeredUnitQuestions})`,
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
          } else {
            response.text().then((text) => {
              console.error(
                `Failed to save unit progress. Status: ${response.status}, Response:`,
                text,
              );
            });
          }
        })
        .catch((error) => {
          console.error("Error saving unit progress:", error);
        });
    } else {
      // Full-length test - don't track unit progresslLength=${isFullLength})`);
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

  // Helper function to capitalize subject name
  const formatSubjectName = (subjectId: string) => {
    return subjectId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-y-auto mb-16 pb-2">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          <PracticeQuizQuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={orderedQuestions.length}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
            isAnswerSubmitted={isAnswerSubmitted}
          />

          {isAnswerSubmitted && (
            <Card className="border-khan-blue bg-blue-50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Explanation</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                {isGeneratingExplanation ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-khan-blue mr-2" />
                    <span className="text-sm text-gray-600">
                      Generating explanation...
                    </span>
                  </div>
                ) : currentExplanation ? (
                  <>
                    <div className="text-sm text-gray-700 prose prose-sm max-w-none mb-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentExplanation}
                      </ReactMarkdown>
                    </div>
                    <ExplanationChat
                      questionPrompt={currentQuestion.prompt}
                      explanation={currentExplanation}
                      correctAnswer={
                        currentQuestion.choices[currentQuestion.answerIndex]
                      }
                      choices={currentQuestion.choices}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="border-t border-gray-200 bg-white fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1"></div>
            <div className="flex justify-center items-center gap-4">
              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  {currentQuestionIndex === orderedQuestions.length - 1
                    ? "Finish Quiz"
                    : "Next Question"}
                </Button>
              )}
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                onClick={onExit}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Exit Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary (Conditionally Rendered) */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-11/12 max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {score}/{orderedQuestions.length}
                </div>
                <p className="text-gray-600">
                  You got {score} question{score !== 1 ? "s" : ""} correct.
                </p>
              </div>
              <Button
                onClick={handleReview}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 w-full text-lg py-6"
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
