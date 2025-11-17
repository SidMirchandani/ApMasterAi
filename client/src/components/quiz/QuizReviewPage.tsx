import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";
import { BlockRenderer } from './BlockRenderer';

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

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
  // Legacy fields for backward compatibility
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
  onSubmit?: (updatedAnswers: { [key: number]: string }, updatedFlagged: Set<number>) => void;
}

export function QuizReviewPage({ questions, userAnswers, flaggedQuestions, onBack, onSubmit }: QuizReviewPageProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [localAnswers, setLocalAnswers] = useState(userAnswers);
  const [localFlagged, setLocalFlagged] = useState(flaggedQuestions);

  const getQuestionState = (index: number) => {
    if (localFlagged.has(index)) return "flagged";
    if (localAnswers[index]) return "answered";
    return "unanswered";
  };

  const getQuestionClass = (index: number) => {
    const isFlagged = localFlagged.has(index);
    const isAnswered = !!userAnswers[index];
    const isCurrent = index === selectedQuestion;
    const baseClass = "w-12 h-12 rounded border-2 text-center font-semibold flex items-center justify-center transition-all cursor-pointer relative";

    // For flagged questions, show red border but background based on state
    if (isFlagged) {
      if (isCurrent) {
        return `${baseClass} bg-gray-900 text-white border-red-600`;
      } else if (isAnswered) {
        return `${baseClass} bg-blue-700 text-white border-red-600`;
      } else {
        return `${baseClass} bg-white text-gray-900 border-red-600`;
      }
    }

    // Non-flagged questions
    if (isCurrent) {
      return `${baseClass} bg-gray-900 text-white border-gray-900`;
    } else if (isAnswered) {
      return `${baseClass} bg-blue-700 text-white border-blue-700`;
    } else {
      return `${baseClass} bg-white text-gray-900 border-gray-400 border-dashed`;
    }
  };

  // Function to render image if URLs are present
  const renderImage = (urls: string[] | undefined) => {
    if (!urls || urls.length === 0) {
      return null;
    }
    return urls.map((url, index) => <img key={index} src={url} alt={`Image ${index + 1}`} className="max-w-full h-auto mb-4 rounded-lg shadow-md" />);
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setLocalAnswers({ ...localAnswers, [questionIndex]: answer });
  };

  const handleToggleFlag = (questionIndex: number) => {
    const newFlagged = new Set(localFlagged);
    if (newFlagged.has(questionIndex)) {
      newFlagged.delete(questionIndex);
    } else {
      newFlagged.add(questionIndex);
    }
    setLocalFlagged(newFlagged);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50">
        <QuizHeader
          title="Review Your Answers"
          timeElapsed={0}
          timerHidden={true}
        />
      </div>

      {selectedQuestion === null ? (
        <div className="flex-1 overflow-y-auto mt-16 md:mt-16 mb-14">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <Card className="p-6">
              <h2 className="text-center text-xl font-semibold mb-2">Check Your Work</h2>
              <p className="text-center text-gray-600 mb-8">
                Click on any question to return to it and review your answer.
              </p>

              <div className="mb-4">
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

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {questions.map((_, index) => {
                    const isAnswered = localAnswers[index] !== undefined;
                    const isFlagged = localFlagged.has(index);

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedQuestion(index)}
                        className={`
                          relative w-full aspect-square rounded flex items-center justify-center font-semibold text-sm
                          transition-all hover:shadow-md
                          ${
                            isFlagged
                              ? isAnswered
                                ? "bg-blue-700 text-white border-2 border-red-600"
                                : "bg-white text-gray-900 border-2 border-red-600"
                              : isAnswered
                              ? "bg-blue-700 text-white border-2 border-blue-700"
                              : "border-2 border-gray-400 border-dashed bg-white"
                          }
                        `}
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="h-3 w-3 text-red-600 absolute -top-1 -right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Fixed Bottom Bar for Review Mode */}
        <div className="border-t border-gray-200 bg-white fixed bottom-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">APMaster</span>
                </div>

                <div className="flex items-center gap-3">
                  {onSubmit && (
                    <Button
                      onClick={() => onSubmit(localAnswers, localFlagged)}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      Submit Test
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
      ) : (
        <div className="flex-1 overflow-y-auto mt-16 md:mt-16 mb-14">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <QuestionCard
              question={questions[selectedQuestion]}
              questionNumber={selectedQuestion + 1}
              selectedAnswer={localAnswers[selectedQuestion]}
              isFlagged={localFlagged.has(selectedQuestion)}
              onAnswerSelect={(answer) => handleAnswerChange(selectedQuestion, answer)}
              onToggleFlag={() => handleToggleFlag(selectedQuestion)}
              isFullLength={true}
              isReviewMode={true}
              renderImage={renderImage}
              isAnswerSubmitted={false}
            />
          </div>
        </div>
      )}

      {selectedQuestion !== null && (
        <QuizBottomBar
          currentQuestion={selectedQuestion + 1}
          totalQuestions={questions.length}
          onOpenPalette={() => setSelectedQuestion(null)}
          onPrevious={() => {
            if (selectedQuestion > 0) {
              setSelectedQuestion(selectedQuestion - 1);
            } else {
              setSelectedQuestion(null);
            }
          }}
          onNext={() => {
            if (selectedQuestion < questions.length - 1) {
              setSelectedQuestion(selectedQuestion + 1);
            }
          }}
          canGoPrevious={true}
          canGoNext={selectedQuestion < questions.length - 1}
          isLastQuestion={false}
          onReview={selectedQuestion === questions.length - 1 ? () => setSelectedQuestion(null) : undefined}
        />
      )}
    </div>
  );
}