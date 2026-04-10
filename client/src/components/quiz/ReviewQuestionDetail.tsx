"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { PrettyExplanation, QUIZ_EXPLANATION_CLASSNAME } from "@/components/ui/PrettyExplanation";
import { BlockRenderer } from "@/components/quiz/BlockRenderer";
import { getDisplayChoicesAndCorrect, getDisplayExplanation } from "@/lib/mcqDisplay";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

export interface ReviewQuestionDetailQuestion {
  id: string;
  prompt_blocks: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  explanation?: string;
}

export interface ReviewQuestionDetailProps {
  question: ReviewQuestionDetailQuestion;
  userAnswer: string | undefined;
  /** Display number for the badge (e.g. 1 for "Question 1 of 35") */
  questionNumber: number;
  /** Optional unit label, e.g. "UNIT 1" */
  unitLabel?: string;
  /** 4 = A-D only; 5 = A-E. Used for E→D swap when stored correct is E. */
  mcqOptionCount?: number;
}

export function ReviewQuestionDetail({
  question,
  userAnswer,
  questionNumber,
  unitLabel,
  mcqOptionCount,
}: ReviewQuestionDetailProps) {
  const { choiceLabels, getChoiceBlocks, displayCorrectLabel } = getDisplayChoicesAndCorrect(
    question,
    mcqOptionCount
  );
  const isCorrect = userAnswer === displayCorrectLabel;

  const explanationCard = question.explanation ? (
    <Card className="border-khan-blue bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 h-fit md:sticky md:top-4">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-[0.775rem] flex items-center gap-2">
          <CheckCircle className="text-khan-blue h-4 w-4" />
          Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <PrettyExplanation className={QUIZ_EXPLANATION_CLASSNAME}>
          {getDisplayExplanation(question.explanation, question, mcqOptionCount)}
        </PrettyExplanation>
      </CardContent>
    </Card>
  ) : null;

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between border-b pb-2 -mx-4 px-4 -mt-4 pt-2 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white px-3 py-1 font-bold text-sm rounded">
              {questionNumber}
            </div>
            {unitLabel && (
              <span className="text-sm font-bold text-khan-green">
                {unitLabel}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex flex-col md:flex-row gap-4 md:items-stretch">
          {/* Question + choices + your answer: left on widescreen, full width on narrow */}
          <div className="flex-1 min-w-0 space-y-2 order-1">
            {/* Question Prompt */}
            <div className="mb-3 text-sm leading-snug">
              <BlockRenderer blocks={question.prompt_blocks} />
            </div>

            {/* Choices */}
            <div className="space-y-2">
              {choiceLabels.map((label) => {
                const isUserAnswer = userAnswer === label;
                const isCorrectAnswer = label === displayCorrectLabel;
                const choiceBlocks = getChoiceBlocks(label as "A" | "B" | "C" | "D" | "E");

                let bgColor = "bg-white dark:bg-slate-800/50";
                let borderColor = "border-gray-200 dark:border-slate-700";
                let textColor = "text-gray-800 dark:text-slate-200";

                if (isCorrectAnswer) {
                  bgColor = "bg-green-50 dark:bg-green-900/20";
                  borderColor = "border-green-500";
                  textColor = "text-green-900 dark:text-green-100";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50 dark:bg-red-900/20";
                  borderColor = "border-red-500";
                  textColor = "text-red-900 dark:text-red-100";
                }

                return (
                  <div
                    key={label}
                    className={`flex items-start gap-2 p-2 rounded-lg border-2 ${bgColor} ${borderColor}`}
                  >
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-semibold text-sm ${
                        isCorrectAnswer
                          ? "border-green-600 bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-200"
                          : isUserAnswer && !isCorrect
                            ? "border-red-600 bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-200"
                            : "border-gray-400 bg-white dark:bg-slate-700 dark:border-slate-600"
                      }`}
                    >
                      {label}
                    </div>
                    <div className={`flex-1 pt-0.5 text-sm ${textColor}`}>
                      <BlockRenderer blocks={choiceBlocks ?? []} />
                      {isCorrectAnswer && (
                        <div className="mt-1.5 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Correct Answer
                        </div>
                      )}
                      {isUserAnswer && !isCorrect && (
                        <div className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" />
                          Your Answer
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={`p-1.5 rounded-lg text-sm ${isCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
            >
              <p className="font-semibold">
                Your answer: {userAnswer || "Not answered"}
                {isCorrect
                  ? " ✓ Correct"
                  : ` ✗ Incorrect (Correct: ${displayCorrectLabel})`}
              </p>
            </div>
          </div>

          {/* Explanation: right on widescreen, below on narrow */}
          {explanationCard && (
            <div className="w-full md:w-[35%] md:min-w-0 flex flex-col order-2">
              {explanationCard}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
