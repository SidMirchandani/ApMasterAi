import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

interface Question {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  prompt?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

interface QuizReviewPageProps {
  questions: Question[];
  userAnswers: { [key: number]: string };
  flaggedQuestions: Set<number>;
  onBack: () => void;
  onSubmit?: (
    updatedAnswers: { [key: number]: string },
    updatedFlagged: Set<number>,
  ) => void;
}

export function QuizReviewPage({
  questions,
  userAnswers,
  flaggedQuestions,
  onBack,
  onSubmit,
}: QuizReviewPageProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  
  // For practice quiz mode, don't allow answer changes
  const isResultsReview = !onSubmit;

  const renderImage = (urls?: string[]) => {
    if (!urls?.length) return null;
    return urls.map((url, i) => (
      <img
        key={i}
        src={url}
        className="max-w-full h-auto mb-4 rounded-lg shadow-md"
      />
    ));
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <QuizHeader title="Review Your Answers" timeElapsed={0} timerHidden />
      </div>

      {/* ====================== RESULTS REVIEW MODE ====================== */}
      {isResultsReview ? (
        <div className="flex-1 overflow-y-auto mt-16 mb-14">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const correctAnswerLetter = String.fromCharCode(65 + question.answerIndex);
              const isCorrect = userAnswer === correctAnswerLetter;
              
              return (
                <Card key={index} className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">Question {index + 1}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </div>
                    </div>
                    
                    {/* Question prompt */}
                    <div className="mb-4 text-gray-800">
                      {question.prompt}
                    </div>
                    
                    {/* Render question images if present */}
                    {renderImage(question.image_urls?.question)}
                  </div>

                  {/* Answer choices */}
                  <div className="space-y-2 mb-4">
                    {Object.entries(question.choices).map(([letter, choice]) => {
                      const isUserAnswer = userAnswer === letter;
                      const isCorrectAnswer = letter === correctAnswerLetter;
                      
                      let bgColor = "bg-white";
                      let borderColor = "border-gray-200";
                      
                      if (isCorrectAnswer) {
                        bgColor = "bg-green-50";
                        borderColor = "border-green-500";
                      } else if (isUserAnswer && !isCorrect) {
                        bgColor = "bg-red-50";
                        borderColor = "border-red-500";
                      }
                      
                      return (
                        <div
                          key={letter}
                          className={`p-3 rounded-lg border-2 ${bgColor} ${borderColor}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-semibold text-gray-700 min-w-[24px]">
                              {letter}.
                            </span>
                            <div className="flex-1">
                              {typeof choice === 'string' ? (
                                <span className="text-gray-800">{choice}</span>
                              ) : (
                                <div className="space-y-2">
                                  {choice.map((block: any, i: number) => (
                                    block.type === 'text' ? (
                                      <span key={i} className="text-gray-800">{block.value}</span>
                                    ) : (
                                      <img key={i} src={block.url} alt="" className="max-w-full h-auto rounded" />
                                    )
                                  ))}
                                </div>
                              )}
                              {isCorrectAnswer && (
                                <span className="ml-2 text-green-600 font-semibold">✓ Correct Answer</span>
                              )}
                              {isUserAnswer && !isCorrect && (
                                <span className="ml-2 text-red-600 font-semibold">✗ Your Answer</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* User's answer summary */}
                  <div className={`p-3 rounded-lg mb-4 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="font-semibold text-sm">
                      Your answer: {userAnswer || "Not answered"}
                      {isCorrect ? " ✓" : ` ✗ (Correct: ${correctAnswerLetter})`}
                    </p>
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2 text-blue-700">Explanation:</h4>
                      <p className="text-gray-700">{question.explanation}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* ====================== PALETTE MODE ====================== */
        selectedQuestion === null ? (
        <>
          <div className="flex-1 overflow-y-auto mt-16 mb-14">
            <div className="max-w-7xl mx-auto px-4 py-8">
              <Card className="p-6">
                <h2 className="text-center text-xl font-semibold mb-2">
                  Check Your Work
                </h2>
                <p className="text-center text-gray-600 mb-8">
                  Click on any question to review your answer.
                </p>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-gray-400 border-dashed"></div>
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-red-600 flex items-center justify-center">
                      <Flag className="h-3 w-3 text-red-600" />
                    </div>
                    <span>For Review</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {questions.map((_, index) => {
                    const answered = localAnswers[index] != null;
                    const flagged = localFlagged.has(index);

                    const base =
                      "relative w-full aspect-square rounded flex items-center justify-center font-semibold text-sm transition-all hover:shadow-md cursor-pointer";

                    const cls = flagged
                      ? answered
                        ? "bg-blue-700 text-white border-2 border-red-600"
                        : "bg-white text-gray-900 border-2 border-red-600"
                      : answered
                        ? "bg-blue-700 text-white border-2 border-blue-700"
                        : "border-2 border-gray-400 border-dashed bg-white";

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedQuestion(index)}
                        className={`${base} ${cls}`}
                      >
                        {index + 1}
                        {flagged && (
                          <Flag className="h-3 w-3 text-red-600 absolute -top-1 -right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* Bottom submit bar */}
          <div className="border-t border-gray-200 bg-white fixed bottom-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <span className="text-sm text-gray-600">APMaster</span>

                {onSubmit && (
                  <Button
                    onClick={() => onSubmit(userAnswers, flaggedQuestions)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Submit Test
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
        ) : (
        /* ====================== QUESTION MODE (for full-length test review) ====================== */
        <div className="flex-1 overflow-y-auto mt-16 mb-14">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <QuestionCard
              question={questions[selectedQuestion]}
              questionNumber={selectedQuestion + 1}
              selectedAnswer={userAnswers[selectedQuestion]}
              isFlagged={flaggedQuestions.has(selectedQuestion)}
              onAnswerSelect={() => {}}
              onToggleFlag={() => {}}
              isFullLength
              isReviewMode
              renderImage={renderImage}
              isAnswerSubmitted={false}
            />
          </div>
        </div>
        )
      )}

      {/* Bottom bar with back button for results review mode */}
      {isResultsReview && (
        <div className="border-t border-gray-200 bg-white fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <span className="text-sm text-gray-600">APMaster</span>
              <Button
                onClick={onBack}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Back to Results
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====================== NAV BAR (for full-length test review) ====================== */}
      {!isResultsReview && selectedQuestion !== null && (
        <QuizBottomBar
          currentQuestion={selectedQuestion + 1}
          totalQuestions={questions.length}
          onOpenPalette={() => setSelectedQuestion(null)}
          onPrevious={() =>
            selectedQuestion > 0
              ? setSelectedQuestion(selectedQuestion - 1)
              : setSelectedQuestion(null)
          }
          onNext={() =>
            selectedQuestion < questions.length - 1 &&
            setSelectedQuestion(selectedQuestion + 1)
          }
          canGoPrevious
          canGoNext={selectedQuestion < questions.length - 1}
          isLastQuestion={selectedQuestion === questions.length - 1}
          onReview={
            selectedQuestion === questions.length - 1
              ? () => setSelectedQuestion(null)
              : undefined
          }
        />
      )}
    </div>
  );
}
