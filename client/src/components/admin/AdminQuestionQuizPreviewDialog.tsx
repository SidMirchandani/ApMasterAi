"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PracticeQuizQuestionCard } from "@/components/quiz/PracticeQuizQuestionCard";
import { ExplanationPanel } from "@/components/quiz/ExplanationPanel";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import { normalizeQuestion } from "@/lib/normalizeQuestion";
import { getSubjectByCode } from "@/subjects";
import {
  getDisplayCorrectLabel,
  getDisplayExplanation,
} from "@/lib/mcqDisplay";

function noopAnswerSelect(_answer: string) {}

export interface AdminQuestionQuizPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw Firestore/admin question shape; normalized internally */
  question: Record<string, unknown> | null | undefined;
}

export function AdminQuestionQuizPreviewDialog({
  open,
  onOpenChange,
  question: rawQuestion,
}: AdminQuestionQuizPreviewDialogProps) {
  const normalized = useMemo(() => {
    if (!rawQuestion || !open) return null;
    return normalizeQuestion({ ...rawQuestion });
  }, [rawQuestion, open]);

  const mcqOptionCount = useMemo(() => {
    const code = normalized?.subject_code;
    if (code == null || typeof code !== "string") return undefined;
    return getSubjectByCode(code)?.metadata?.mcqOptionCount;
  }, [normalized?.subject_code]);

  const displayCorrect =
    normalized != null ? getDisplayCorrectLabel(normalized, mcqOptionCount) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[min(100vw-1rem,72rem)] max-h-[90vh] flex flex-col overflow-hidden gap-3 p-4 sm:p-6 dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader className="shrink-0">
          <DialogTitle className="dark:text-white">Quiz preview</DialogTitle>
        </DialogHeader>
        {normalized != null && displayCorrect != null ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-3xl pb-2">
                <PracticeQuizQuestionCard
                  question={normalized}
                  questionNumber={1}
                  totalQuestions={1}
                  selectedAnswer={displayCorrect}
                  onAnswerSelect={noopAnswerSelect}
                  isAnswerSubmitted
                  mcqOptionCount={mcqOptionCount}
                />
                <ExplanationPanel hasAnswered>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Correct.
                  </p>
                  {normalized.explanation ? (
                    <PrettyExplanation className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                      {getDisplayExplanation(
                        normalized.explanation as string,
                        normalized,
                        mcqOptionCount,
                      )}
                    </PrettyExplanation>
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      No explanation on this question.
                    </span>
                  )}
                </ExplanationPanel>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
