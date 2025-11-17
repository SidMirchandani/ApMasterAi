
import { useState } from "react";
import { QuizHeader } from "./QuizHeader";
import { QuestionCard } from "./QuestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import { Button } from "@/components/ui/button";

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
}

export function PracticeQuiz({ questions, subjectId, timeElapsed, onExit, onComplete }: PracticeQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timerHidden, setTimerHidden] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

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
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <QuizHeader
        title={`AP® ${formatSubjectName(subjectId)} Practice Quiz`}
        timeElapsed={timeElapsed}
        onHideTimer={() => setTimerHidden(!timerHidden)}
        timerHidden={timerHidden}
      />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="text-sm text-gray-600 mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
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
          />

          {isAnswerSubmitted && (
            <Card className="border-khan-blue bg-blue-50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Explanation</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                {currentQuestion.explanation ? (
                  <ExplanationChat 
                    questionPrompt={currentQuestion.prompt}
                    explanation={currentQuestion.explanation}
                    correctAnswer={currentQuestion.choices[currentQuestion.answerIndex]}
                    choices={currentQuestion.choices}
                  />
                ) : (
                  <p className="text-sm text-gray-600 italic">No explanation available for this question.</p>
                )}
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
                {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
