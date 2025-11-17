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
  subjectId: string;
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
  subjectId,
  onBack,
  onSubmit,
}: QuizReviewPageProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [localAnswers, setLocalAnswers] = useState(userAnswers);
  const [localFlagged, setLocalFlagged] = useState(flaggedQuestions);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setLocalAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleToggleFlag = (questionIndex: number) => {
    setLocalFlagged((prev) => {
      const updated = new Set(prev);
      if (updated.has(questionIndex)) updated.delete(questionIndex);
      else updated.add(questionIndex);
      return updated;
    });
  };

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
        <QuizHeader 
          title={selectedQuestion === null ? "Review Your Answers" : (subjectId || '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} 
          timeElapsed={0} 
          timerHidden 
        />
      </div>

      {/* ====================== PALETTE MODE ====================== */}
      {selectedQuestion === null ? (
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
                <div className="flex items-center justify-center gap-4 mb-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border-2 border-gray-400 border-dashed"></div>
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-700 border-2 border-blue-700"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-gray-800 border-2 border-gray-800"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border-2 border-red-600 flex items-center justify-center">
                      <Flag className="h-2 w-2 text-red-600" />
                    </div>
                    <span>For Review</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-15 sm:grid-cols-20 lg:grid-cols-25 gap-1">
                  {questions.map((_, index) => {
                    const answered = localAnswers[index] != null;
                    const flagged = localFlagged.has(index);
                    const isCurrent = selectedQuestion === index;

                    const base =
                      "relative w-full aspect-square rounded flex items-center justify-center font-semibold text-[10px] transition-all hover:shadow-md cursor-pointer";

                    const cls = isCurrent
                      ? "bg-gray-800 text-white border-2 border-gray-800"
                      : flagged
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
                        {flagged && !isCurrent && (
                          <Flag className="h-2 w-2 text-red-600 absolute -top-0.5 -right-0.5" />
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
                <span className="text-xl font-bold text-khan-green">APMaster</span>

                {onSubmit && (
                  <Button
                    onClick={() => onSubmit(localAnswers, localFlagged)}
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
        /* ====================== QUESTION MODE ====================== */
        <div className="flex-1 overflow-y-auto mt-16 mb-14">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <QuestionCard
              question={questions[selectedQuestion]}
              questionNumber={selectedQuestion + 1}
              selectedAnswer={localAnswers[selectedQuestion]}
              isFlagged={localFlagged.has(selectedQuestion)}
              onAnswerSelect={(a) => handleAnswerChange(selectedQuestion, a)}
              onToggleFlag={() => handleToggleFlag(selectedQuestion)}
              isFullLength
              isReviewMode
              renderImage={renderImage}
              isAnswerSubmitted={false}
            />
          </div>
        </div>
      )}

      {/* ====================== NAV BAR ====================== */}
      {selectedQuestion !== null && (
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
