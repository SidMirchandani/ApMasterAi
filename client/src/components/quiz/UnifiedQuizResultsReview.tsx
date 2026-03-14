"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { getSectionInfo, getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel } from "@/lib/mcqDisplay";
import { QuizBottomBar } from "./QuizBottomBar";
import { ReviewQuestionDetail } from "./ReviewQuestionDetail";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

interface Question {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks?: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  prompt?: string;
}

export interface UnifiedQuizResultsReviewProps {
  questions: Question[];
  userAnswers: { [key: number]: string };
  subjectId: string;
  score: number;
  totalQuestions: number;
  isFullLength: boolean;
  onCloseReview: () => void;
  /** When set, unit row clicks navigate to section-review; otherwise we show question detail inline */
  testId?: string;
}

export function UnifiedQuizResultsReview({
  questions,
  userAnswers,
  subjectId,
  score,
  totalQuestions,
  isFullLength,
  onCloseReview,
  testId,
}: UnifiedQuizResultsReviewProps) {
  const router = useRouter();
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const apiCode = subject?.subjectCode || subjectId;
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  // Correct/incorrect per question (using display correct label for 4-option subjects)
  const correctMap = questions.reduce<Record<number, boolean>>((acc, q, i) => {
    const correctLabel = getDisplayCorrectLabel(q, mcqOptionCount);
    acc[i] = userAnswers[i] === correctLabel;
    return acc;
  }, {});

  const incorrectIndices = questions
    .map((_, i) => i)
    .filter((i) => !correctMap[i]);

  // Section breakdown for full-length (and unit quizzes with section_code on questions)
  const sectionPerformance = (() => {
    const map: Record<
      string,
      { name: string; unitNumber: number; correct: number; total: number; percentage: number }
    > = {};
    questions.forEach((q, i) => {
      const code = q.section_code || "Unknown";
      const info = getSectionInfo(apiCode, code) || { name: code, unitNumber: 0 };
      if (!map[code])
        map[code] = { name: info.name, unitNumber: info.unitNumber, correct: 0, total: 0, percentage: 0 };
      map[code].total++;
      const correctLabel = getDisplayCorrectLabel(q, mcqOptionCount);
      if (userAnswers[i] === correctLabel) map[code].correct++;
    });
    Object.values(map).forEach((s) => {
      s.percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    });
    return map;
  })();

  // Full unit list from subject (for Review by Unit: show all units, grey out those with no questions)
  const allSectionEntries = (() => {
    if (!subject?.units || !subject?.sections) return Object.entries(sectionPerformance).sort(
      ([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0)
    );
    const entries: Array<[string, { name: string; unitNumber: number; correct: number; total: number; percentage: number }]> = [];
    subject.units.forEach((unit) => {
      const sec = subject.sections[unit.id];
      if (!sec) return;
      const perf = sectionPerformance[sec.code];
      entries.push([
        sec.code,
        perf ?? {
          name: sec.name,
          unitNumber: sec.unitNumber,
          correct: 0,
          total: 0,
          percentage: 0,
        },
      ]);
    });
    return entries.sort(([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0));
  })();

  const handleViewSection = (sectionCode: string, total: number) => {
    if (total === 0) return;
    if (testId) {
      const mode = sectionCode === "all" || sectionCode === "incorrect" ? "&mode=review" : "";
      router.push(
        `/section-review?subject=${subjectId}&testId=${testId}&section=${sectionCode}${mode}`
      );
    } else {
      const firstIndex = questions.findIndex((q) => (q.section_code || "Unknown") === sectionCode);
      if (firstIndex >= 0) setSelectedQuestionIndex(firstIndex);
    }
  };

  // Question detail view: same layout as section-review (ReviewQuestionDetail + QuizBottomBar)
  if (selectedQuestionIndex !== null) {
    const q = questions[selectedQuestionIndex];
    if (!q) return null;
    const sec = q.section_code ? sectionPerformance[q.section_code] : null;
    const unitLabel = sec ? `UNIT ${sec.unitNumber}` : undefined;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900/30 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-14 pt-2">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <ReviewQuestionDetail
              question={q as any}
              userAnswer={userAnswers[selectedQuestionIndex]}
              questionNumber={selectedQuestionIndex + 1}
              unitLabel={unitLabel}
              mcqOptionCount={mcqOptionCount}
            />
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <QuizBottomBar
            currentQuestion={selectedQuestionIndex + 1}
            totalQuestions={questions.length}
            onPrevious={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
            onNext={() => setSelectedQuestionIndex(Math.min(questions.length - 1, selectedQuestionIndex + 1))}
            canGoPrevious={selectedQuestionIndex > 0}
            canGoNext={selectedQuestionIndex < questions.length - 1}
            isLastQuestion={selectedQuestionIndex === questions.length - 1}
            reviewOnly
            onExit={() => setSelectedQuestionIndex(null)}
            exitLabel="Back to results"
          />
        </div>
      </div>
    );
  }

  // Summary view: Close Review, score, grid, buttons, Review By Unit
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900/30">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Quiz Results</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={onCloseReview}
            className="shrink-0"
          >
            Close Review
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Center-aligned score and review actions */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {score}/{totalQuestions} ({percentage}% Accuracy)
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {testId ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleViewSection("all", questions.length)}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  Review All Questions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewSection("incorrect", incorrectIndices.length)}
                  disabled={incorrectIndices.length === 0}
                >
                  Review Incorrect Questions
                  {incorrectIndices.length > 0 && (
                    <span className="ml-1.5 text-slate-500">({incorrectIndices.length})</span>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSelectedQuestionIndex(0)}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  Review All Questions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (incorrectIndices.length > 0) setSelectedQuestionIndex(incorrectIndices[0]);
                  }}
                  disabled={incorrectIndices.length === 0}
                >
                  Review Incorrect Questions
                  {incorrectIndices.length > 0 && (
                    <span className="ml-1.5 text-slate-500">({incorrectIndices.length})</span>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Question grid: green = correct, red = incorrect */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="grid gap-2 grid-cols-5 sm:grid-cols-10">
              {questions.map((_, index) => {
                const isCorrect = correctMap[index];
                const base =
                  "aspect-square max-w-[55px] min-w-[36px] w-full rounded flex items-center justify-center font-semibold text-sm transition-all hover:opacity-90 cursor-pointer";
                const cls = isCorrect
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-emerald-600"
                  : "bg-red-500 hover:bg-red-600 text-white border-2 border-red-600";
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedQuestionIndex(index)}
                    className={`${base} ${cls}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Review By Unit: full unit list, grey when no questions, neutral track with accuracy fill */}
        {allSectionEntries.length > 0 && (
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Review By Unit
              </h2>
              <div className="space-y-3">
                {allSectionEntries.map(([code, sec]) => {
                  const hasQuestions = sec.total > 0;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleViewSection(code, sec.total)}
                      disabled={!hasQuestions}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors group ${
                        hasQuestions
                          ? "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${
                          hasQuestions ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                        }`}>
                          UNIT {sec.unitNumber || "?"}: {sec.name}
                          {!hasQuestions && " (No questions)"}
                        </div>
                        <div className="mt-1.5 relative h-2 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                          {/* Neutral track; only the accuracy-reached portion is colored */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full min-w-[2px] bg-emerald-500 dark:bg-emerald-500"
                            style={{ width: `${Math.min(100, Math.max(0, sec.percentage))}%` }}
                          />
                        </div>
                      </div>
                      {hasQuestions && (
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
