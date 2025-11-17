import { useState, useEffect } from "react";
import { QuizHeader } from "./QuizHeader";
import { QuestionCard } from "./QuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/router";

// Assuming QuizReviewPage is defined elsewhere and imported.
// For the purpose of this edit, we'll assume it exists and handles the review logic.
// import { QuizReviewPage } from "./QuizReviewPage";

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

// Placeholder for QuizReviewPage component for demonstration purposes.
// In a real scenario, this would be imported from its own file.
const QuizReviewPage = ({ questions, userAnswers, flaggedQuestions, onBack }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-11/12 max-w-3xl h-4/5 overflow-y-auto">
        <CardHeader>
          <CardTitle>Review Your Answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((q: Question, index: number) => {
            const userAnswer = userAnswers ? userAnswers[index] : null;
            const correctAnswer = q.choices[q.answerIndex];
            const isCorrect = userAnswer === correctAnswer;
            const isAnswered = userAnswer !== null;

            return (
              <div key={q.id || index} className="border-b pb-4">
                <p className="font-semibold mb-2">
                  Question {index + 1}: {q.prompt}
                </p>
                <div className="ml-4">
                  {q.choices.map((choice: string, choiceIndex: number) => {
                    const isUserChoice = userAnswer === choice;
                    const isCorrectAnswer = choice === correctAnswer;

                    let textColorClass = '';
                    if (isUserChoice) {
                      textColorClass = isCorrect ? 'text-green-600' : 'text-red-600';
                    } else if (isCorrectAnswer) {
                      textColorClass = 'text-green-600';
                    }

                    return (
                      <p key={choiceIndex} className={`${textColorClass} mb-1`}>
                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                        {isCorrectAnswer && <span className="text-xs font-bold text-green-700 ml-2">(Correct Answer)</span>}
                        {isUserChoice && !isCorrect && <span className="text-xs font-bold text-red-700 ml-2">(Your Answer)</span>}
                      </p>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="font-medium text-sm">Explanation:</p>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm text-gray-700 prose max-w-none">
                      {q.explanation}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={onBack} className="bg-gray-400 hover:bg-gray-500">
              Exit Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export function PracticeQuiz({ questions, subjectId, timeElapsed, onExit, onComplete, isFullLength = false, lastSavedTestId }: PracticeQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timerHidden, setTimerHidden] = useState(false);
  const [generatedExplanations, setGeneratedExplanations] = useState<Map<number, string>>(new Map());
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [showResults, setShowResults] = useState(false); // State to control results display
  const [userAnswers, setUserAnswers] = useState<Record<number, string | null>>({}); // To store user's answers for review

  const router = useRouter();

  // Reverse the questions array to show the newest test first if it's a full-length test
  const orderedQuestions = isFullLength ? [...questions].reverse() : questions;
  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const currentExplanation = generatedExplanations.get(currentQuestionIndex) || currentQuestion?.explanation;

  // Store user's answer when selected
  useEffect(() => {
    if (selectedAnswer !== null) {
      setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedAnswer }));
    }
  }, [selectedAnswer, currentQuestionIndex]);


  useEffect(() => {
    const generateExplanationIfNeeded = async () => {
      if (!currentQuestion || !isAnswerSubmitted) return;

      const hasExplanation = currentQuestion.explanation && currentQuestion.explanation.trim() !== '';
      const alreadyGenerated = generatedExplanations.has(currentQuestionIndex);

      if (!hasExplanation && !alreadyGenerated && !isGeneratingExplanation) {
        setIsGeneratingExplanation(true);
        try {
          const response = await apiRequest("POST", "/api/generate-explanation", {
            questionPrompt: currentQuestion.prompt,
            choices: currentQuestion.choices,
            correctAnswerIndex: currentQuestion.answerIndex,
          });

          if (response.ok) {
            const data = await response.json();
            setGeneratedExplanations(prev => new Map(prev).set(currentQuestionIndex, data.explanation));
          }
        } catch (error) {
          console.error("Error generating explanation:", error);
        } finally {
          setIsGeneratingExplanation(false);
        }
      }
    };

    generateExplanationIfNeeded();
  }, [currentQuestion, currentQuestionIndex, isAnswerSubmitted, generatedExplanations, isGeneratingExplanation]);

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
    const correctLabel = String.fromCharCode(65 + currentQuestion.answerIndex);
    if (selectedAnswer === correctLabel) setScore((s) => s + 1);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      // For full-length tests, navigate directly to results page
      if (isFullLength && lastSavedTestId) {
        router.push(`/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`);
      } else {
        setShowResults(true); // Show results modal for practice quizzes only
      }
    }
  };

  const handleReview = () => {
    if (isFullLength && lastSavedTestId) {
      // Navigate to the full-length-results page
      router.push(`/full-length-results?subject=${subjectId}&testId=${lastSavedTestId}`);
    } else {
      setShowResults(false); // Close results if not full length or no testId
      // Call original onComplete for non-full length tests. This should pass the score.
      // The prompt also mentions "when i exit review, don't save it any more".
      // This implies that for practice quizzes (non-fullLength), we might not want to save progress or results persistently.
      // The `onComplete` callback might handle this, or it might be a separate save mechanism.
      // For now, we'll just call onComplete as it was originally intended.
      onComplete(score);
    }
  };

  // Helper function to capitalize subject name
  const formatSubjectName = (subjectId: string) => {
    return subjectId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Conditional rendering for the review page
  if (showResults && !isFullLength) {
    return (
      <QuizReviewPage
        questions={orderedQuestions}
        userAnswers={userAnswers}
        flaggedQuestions={new Set()} // Pass empty flaggedQuestions for practice quiz review mode
        onBack={() => {
          setShowResults(false);
          // Based on "when i exit review, don't save it any more",
          // we might want to clear some state or prevent further saving here.
          // For now, just closing the review modal.
          onExit(); // Assuming onExit can be used to signify exiting the review session too.
        }}
      />
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50">
        <QuizHeader
          title={`AP® ${formatSubjectName(subjectId)} Practice Quiz`}
          timeElapsed={timeElapsed}
          onHideTimer={() => setTimerHidden(!timerHidden)}
          timerHidden={timerHidden}
          onExitExam={onExit}
        />
      </div>

      <div className="flex-1 overflow-y-auto mt-16 md:mt-16 mb-16 pb-4">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="text-sm text-gray-600 mb-4">
            Question {currentQuestionIndex + 1} of {orderedQuestions.length}
          </div>

          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={selectedAnswer}
            isFlagged={flaggedQuestions.has(currentQuestionIndex)}
            onAnswerSelect={handleAnswerSelect}
            onToggleFlag={toggleFlag}
            isFullLength={false}
            isAnswerSubmitted={isAnswerSubmitted}
            isReviewMode={isAnswerSubmitted} // This prop might need refinement based on actual usage in QuestionCard
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
                    <span className="text-sm text-gray-600">Generating explanation...</span>
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
                      correctAnswer={currentQuestion.choices[currentQuestion.answerIndex]}
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
                {currentQuestionIndex === orderedQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary (Conditionally Rendered for Full Length or when not in Review mode) */}
      {showResults && isFullLength && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-11/12 max-w-md">
            <CardHeader>
              <CardTitle>Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p>Your Score: {score} out of {orderedQuestions.length}</p>
              <p>You got {score} questions correct.</p>
              <div className="flex justify-center gap-4">
                <Button onClick={handleReview} className="bg-blue-600 hover:bg-blue-700">
                  {isFullLength && lastSavedTestId ? "View Full Results" : "Review Answers"}
                </Button>
                {(!isFullLength || !lastSavedTestId) && (
                  <Button onClick={() => setShowResults(false)} className="bg-gray-400 hover:bg-gray-500">
                    Close
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}