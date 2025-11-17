
import { useState } from "react";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";
import { QuestionCard } from "./QuestionCard";
import { EnhancedQuestionPalette } from "./EnhancedQuestionPalette";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplanationChat } from "@/components/ui/explanation-chat";

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
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});

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
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: selectedAnswer }));
    const correctLabel = String.fromCharCode(65 + currentQuestion.answerIndex);
    if (selectedAnswer === correctLabel) setScore(score + 1);
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

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <QuizHeader
        title={`AP® ${subjectId.charAt(0).toUpperCase() + subjectId.slice(1).replace(/-/g, ' ')} Practice Quiz`}
        timeElapsed={timeElapsed}
        onHideTimer={() => setTimerHidden(!timerHidden)}
        timerHidden={timerHidden}
      />

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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

          {isAnswerSubmitted && currentQuestion.explanation && (
            <Card className="border-khan-blue bg-blue-50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Explanation</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <ExplanationChat explanation={currentQuestion.explanation} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <QuizBottomBar
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        onOpenPalette={() => setShowQuestionPalette(true)}
        onPrevious={handlePreviousQuestion}
        onNext={isAnswerSubmitted ? handleNextQuestion : undefined}
        canGoPrevious={currentQuestionIndex > 0}
        canGoNext={isAnswerSubmitted}
        isLastQuestion={currentQuestionIndex === questions.length - 1}
        onSubmit={isAnswerSubmitted ? handleNextQuestion : handleSubmitAnswer}
      />

      <EnhancedQuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        currentQuestion={currentQuestionIndex}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onQuestionSelect={setCurrentQuestionIndex}
      />
    </div>
  );
}
