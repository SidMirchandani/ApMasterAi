import { useState, useEffect } from "react";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";
import { QuestionCard } from "./QuestionCard";
import { EnhancedQuestionPalette } from "./EnhancedQuestionPalette";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { QuizReviewPage } from "./QuizReviewPage"; // Assuming QuizReviewPage is in the same directory

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

interface FullLengthQuizProps {
  questions: Question[];
  subjectId: string;
  timeElapsed: number;
  onExit: () => void;
  onSubmit: () => void;
  onSaveAndExit: (state: any) => void;
  savedState?: any;
}

export function FullLengthQuiz({ questions, subjectId, timeElapsed, onExit, onSubmit, onSaveAndExit, savedState }: FullLengthQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedState?.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>(savedState?.userAnswers || {});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set(savedState?.flaggedQuestions || []));
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false); // State for review mode

  const currentQuestion = questions[currentQuestionIndex];

  // Added logic for review mode rendering
  if (isReviewMode) {
    return (
      <QuizReviewPage
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onBack={() => setIsReviewMode(false)}
        onSubmit={() => {
          setIsReviewMode(false);
          setShowSubmitConfirm(true);
        }}
      />
    );
  }

  const handleExitExam = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    const examState = {
      currentQuestionIndex,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      timeElapsed,
    };
    onSaveAndExit(examState);
  };

  const handleAnswerSelect = (answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answer }));
  };

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const ns = new Set(prev);
      if (ns.has(currentQuestionIndex)) ns.delete(currentQuestionIndex);
      else ns.add(currentQuestionIndex);
      return ns;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  };

  const handleSubmitTest = () => {
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = () => {
    onSubmit();
    setShowSubmitConfirm(false);
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
        title={`AP® ${subjectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Practice Exam`}
        timeElapsed={timeElapsed}
        onHideTimer={() => setTimerHidden(!timerHidden)}
        timerHidden={timerHidden}
        onExitExam={handleExitExam}
      />

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={userAnswers[currentQuestionIndex]}
            isFlagged={flaggedQuestions.has(currentQuestionIndex)}
            onAnswerSelect={handleAnswerSelect}
            onToggleFlag={toggleFlag}
            isFullLength={true}
            renderImage={renderImage} // Pass the renderImage function
          />
        </div>
      </div>

      <QuizBottomBar
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        onOpenPalette={() => setShowQuestionPalette(true)}
        onPrevious={handlePreviousQuestion}
        onNext={handleNextQuestion}
        canGoPrevious={currentQuestionIndex > 0}
        canGoNext={currentQuestionIndex < questions.length - 1}
        isLastQuestion={currentQuestionIndex === questions.length - 1}
        onSubmit={handleSubmitTest}
        onReview={currentQuestionIndex === questions.length - 1 ? () => setIsReviewMode(true) : undefined}
      />

      <EnhancedQuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        currentQuestion={currentQuestionIndex}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onQuestionSelect={setCurrentQuestionIndex}
        onGoToReview={() => setIsReviewMode(true)}
      />

      <SubmitConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={confirmSubmit}
      />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit the Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved and you can continue this exam later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Save and Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}