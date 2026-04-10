import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, XCircle } from "lucide-react";
import { BlockRenderer } from "./BlockRenderer";
import { PrettyExplanation, QUIZ_EXPLANATION_CLASSNAME } from "@/components/ui/PrettyExplanation";
import { cn } from "@/lib/utils";
import { getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayChoicesAndCorrect, getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";

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

interface PracticeQuizReviewProps {
  questions: Question[];
  userAnswers: { [key: number]: string };
  onClose: () => void;
  subjectId?: string;
}

export function PracticeQuizReview({
  questions,
  userAnswers,
  onClose,
  subjectId,
}: PracticeQuizReviewProps) {
  const subject = subjectId ? getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId) : undefined;
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      const correctLabel = getDisplayCorrectLabel(q, mcqOptionCount);
      if (userAnswers[i] === correctLabel) {
        correct++;
      }
    });
    return correct;
  };

  const score = calculateScore();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Review Your Answers</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{score}/{questions.length}</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{score}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{questions.length - score}</div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question, index) => {
            const userAnswer = userAnswers[index];
            const { choiceLabels, getChoiceBlocks, displayCorrectLabel } = getDisplayChoicesAndCorrect(question, mcqOptionCount);
            const correctLabel = displayCorrectLabel;
            const isCorrect = userAnswer === correctLabel;
            const isExpanded = expandedQuestions.has(index);

            return (
              <Card key={index} className={`${isCorrect ? 'border-green-500' : 'border-red-500'} border-2`}>
                <CardHeader className="cursor-pointer" onClick={() => toggleQuestion(index)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCorrect ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                        <div className="mt-2 text-sm">
                          <span className={`font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            Your answer: {userAnswer || "Not answered"}
                          </span>
                          {!isCorrect && (
                            <span className="ml-2 text-green-600 font-semibold">
                              Correct: {correctLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      {isExpanded ? "Hide" : "Show"} Details
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* Question Prompt */}
                    <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-slate-800/60">
                      <div className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Question:</div>
                      <BlockRenderer blocks={question.prompt_blocks} />
                    </div>

                    {/* Answer Choices */}
                    <div className="space-y-3 mb-6">
                      {choiceLabels.map((label) => {
                        const isUserAnswer = userAnswer === label;
                        const isCorrectAnswer = label === correctLabel;

                        let bgColor =
                          "bg-white dark:bg-slate-800";
                        let borderColor =
                          "border-gray-200 dark:border-slate-600";
                        let textColor =
                          "text-gray-800 dark:text-slate-200";

                        if (isCorrectAnswer) {
                          bgColor =
                            "bg-green-50 dark:bg-green-950/40";
                          borderColor =
                            "border-green-500 dark:border-green-600";
                          textColor =
                            "text-green-900 dark:text-green-100";
                        } else if (isUserAnswer && !isCorrect) {
                          bgColor =
                            "bg-red-50 dark:bg-red-950/40";
                          borderColor =
                            "border-red-500 dark:border-red-600";
                          textColor =
                            "text-red-900 dark:text-red-100";
                        }

                        return (
                          <div
                            key={label}
                            className={`flex items-start gap-4 p-4 rounded-lg border-2 ${bgColor} ${borderColor}`}
                          >
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                              isCorrectAnswer
                                ? "border-green-600 bg-green-100 text-green-700 dark:border-green-500 dark:bg-green-900/50 dark:text-green-200"
                                : isUserAnswer && !isCorrect
                                  ? "border-red-600 bg-red-100 text-red-700 dark:border-red-500 dark:bg-red-900/50 dark:text-red-200"
                                  : "border-gray-400 bg-white dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200"
                            }`}>
                              {label}
                            </div>
                            <div className={`flex-1 pt-1.5 ${textColor}`}>
                              <BlockRenderer blocks={getChoiceBlocks(label) ?? []} />
                              {isCorrectAnswer && (
                                <div className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
                                  ✓ Correct Answer
                                </div>
                              )}
                              {isUserAnswer && !isCorrect && (
                                <div className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                  ✗ Your Answer
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className={`p-4 rounded-lg border-2 ${
                        isCorrect
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      }`}>
                        <div className={`font-semibold mb-2 ${isCorrect ? "text-emerald-900 dark:text-emerald-300" : "text-red-900 dark:text-red-300"}`}>
                          {isCorrect ? "Correct — Explanation:" : "Incorrect — Explanation:"}
                        </div>
                        <PrettyExplanation
                          className={cn(
                            QUIZ_EXPLANATION_CLASSNAME,
                            isCorrect
                              ? "text-emerald-900 dark:text-emerald-200"
                              : "text-red-900 dark:text-red-200",
                          )}
                        >
                          {getDisplayExplanation(question.explanation, question, mcqOptionCount)}
                        </PrettyExplanation>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Close Button at Bottom */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={onClose}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 px-12"
          >
            Close Review
          </Button>
        </div>
      </div>
    </div>
  );
}
