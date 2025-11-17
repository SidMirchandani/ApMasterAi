
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Flag } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";

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

interface QuizReviewPageProps {
  questions: Question[];
  userAnswers: { [key: number]: string };
  flaggedQuestions: Set<number>;
  onBack: () => void;
  onSubmit?: () => void;
}

export function QuizReviewPage({ questions, userAnswers, flaggedQuestions, onBack, onSubmit }: QuizReviewPageProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  const getQuestionState = (index: number) => {
    if (flaggedQuestions.has(index)) return "flagged";
    if (userAnswers[index]) return "answered";
    return "unanswered";
  };

  const getQuestionClass = (index: number) => {
    const isFlagged = flaggedQuestions.has(index);
    const isAnswered = !!userAnswers[index];
    const isCurrent = index === selectedQuestion;
    const baseClass = "w-12 h-12 rounded border-2 text-center font-semibold flex items-center justify-center transition-all cursor-pointer relative";
    
    // For flagged questions, show red border but background based on state
    if (isFlagged) {
      if (isCurrent) {
        return `${baseClass} bg-gray-900 text-white border-red-500`;
      } else if (isAnswered) {
        return `${baseClass} bg-blue-600 text-white border-red-500`;
      } else {
        return `${baseClass} bg-white text-gray-900 border-red-500`;
      }
    }
    
    // Non-flagged questions
    if (isCurrent) {
      return `${baseClass} bg-gray-900 text-white border-gray-900`;
    } else if (isAnswered) {
      return `${baseClass} bg-blue-600 text-white border-blue-600`;
    } else {
      return `${baseClass} bg-white text-gray-900 border-gray-300 border-dashed`;
    }
  };

  // Function to render image if URLs are present
  const renderImage = (urls: string[] | undefined) => {
    if (!urls || urls.length === 0) {
      return null;
    }
    return urls.map((url, index) => <img key={index} src={url} alt={`Image ${index + 1}`} className="max-w-full h-auto mb-4 rounded-lg shadow-md" />);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <QuizHeader
        title="Review Your Answers"
        timeElapsed={0}
        timerHidden={true}
      />

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {selectedQuestion === null ? (
            <Card className="p-6">
              <h2 className="text-center text-xl font-semibold mb-2">Check Your Work</h2>
              <p className="text-center text-gray-600 mb-8">
                Click on any question to return to it and review your answer.
              </p>

              <div className="mb-4">
                <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-gray-300 border-dashed"></div>
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-50 border-2 border-red-500 flex items-center justify-center">
                      <Flag className="h-3 w-3 text-red-500" />
                    </div>
                    <span>For Review</span>
                  </div>
                </div>

                <div className="grid grid-cols-10 gap-3">
                  {questions.map((_, i) => {
                    const state = getQuestionState(i);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedQuestion(i)}
                        className={getQuestionClass(i)}
                      >
                        {i + 1}
                        {state === "flagged" && (
                          <Flag className="h-3 w-3 text-red-500 absolute -top-1 -right-1" fill="currentColor" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : (
            <QuestionCard
              question={questions[selectedQuestion]}
              questionNumber={selectedQuestion + 1}
              selectedAnswer={userAnswers[selectedQuestion]}
              isFlagged={flaggedQuestions.has(selectedQuestion)}
              onAnswerSelect={() => {}}
              onToggleFlag={() => {}}
              isFullLength={true}
              isAnswerSubmitted={true}
              renderImage={renderImage}
            />
          )}
        </div>
      </div>

      {selectedQuestion === null ? (
        <div className="border-t border-gray-200 bg-white sticky bottom-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">APMaster</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex items-center gap-2"
                >
                  Back to Questions
                </Button>
                {onSubmit && (
                  <Button
                    onClick={onSubmit}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Submit Test
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
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
