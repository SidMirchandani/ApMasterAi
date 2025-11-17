
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, MoreVertical, Flag } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import { QuestionPalette } from "./QuestionPalette";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";
import { ExitConfirmDialog } from "./ExitConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
}

export function FullLengthQuiz({ questions, subjectId, timeElapsed, onExit, onSubmit }: FullLengthQuizProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );
  const progress = ((currentPage + 1) / totalPages) * 100;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (answer: string, questionIndex: number) => {
    const globalIndex = currentPage * questionsPerPage + questionIndex;
    setUserAnswers((prev) => ({ ...prev, [globalIndex]: answer }));
  };

  const toggleFlag = (questionIndex: number) => {
    setFlaggedQuestions((prev) => {
      const ns = new Set(prev);
      if (ns.has(questionIndex)) ns.delete(questionIndex);
      else ns.add(questionIndex);
      return ns;
    });
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage((p) => p + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) setCurrentPage((p) => p - 1);
  };

  const handleSubmitTest = () => {
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = () => {
    onSubmit();
    setShowSubmitConfirm(false);
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => setShowExitDialog(true)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <div className="text-gray-600 text-sm">
            Time: {formatTime(timeElapsed)}
          </div>

          <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <DropdownMenuTrigger>
              <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right">
              <DropdownMenuItem onClick={() => setShowQuestionPalette(true)}>
                Question Palette
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowExitDialog(true)}>
                Exit Test
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Progress value={progress} className="mb-6" />

        {/* Questions */}
        <div className="space-y-8">
          {currentQuestions.map((q, idx) => {
            const globalIndex = currentPage * questionsPerPage + idx;
            const userAnswer = userAnswers[globalIndex];
            const flagged = flaggedQuestions.has(globalIndex);

            return (
              <QuestionCard
                key={globalIndex}
                question={q}
                questionNumber={globalIndex + 1}
                selectedAnswer={userAnswer}
                isFlagged={flagged}
                onAnswerSelect={(answer) => handleAnswerSelect(answer, idx)}
                onToggleFlag={() => toggleFlag(globalIndex)}
                isFullLength={true}
              />
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={handlePreviousPage}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          {currentPage === totalPages - 1 ? (
            <Button onClick={handleSubmitTest}>Submit Test</Button>
          ) : (
            <Button onClick={handleNextPage}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Palette Modal */}
      <QuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onQuestionSelect={(index) => {
          setCurrentPage(Math.floor(index / questionsPerPage));
          setShowQuestionPalette(false);
        }}
      />

      {/* Exit Confirmation */}
      <ExitConfirmDialog
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onConfirm={onExit}
      />

      {/* Submit Confirmation */}
      <SubmitConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={confirmSubmit}
      />
    </div>
  );
}
