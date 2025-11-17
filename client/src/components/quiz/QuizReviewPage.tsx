
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flag, FileQuestion } from "lucide-react";
import { QuestionCard } from "./QuestionCard";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="outline" onClick={onBack}>Back</Button>
            {onSubmit && (
              <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-700">
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>

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
          <div className="space-y-6">
            <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
              ← Back to Overview
            </Button>
            
            <QuestionCard
              question={questions[selectedQuestion]}
              questionNumber={selectedQuestion + 1}
              selectedAnswer={userAnswers[selectedQuestion]}
              isFlagged={flaggedQuestions.has(selectedQuestion)}
              onAnswerSelect={() => {}}
              onToggleFlag={() => {}}
              isFullLength={true}
              isAnswerSubmitted={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
