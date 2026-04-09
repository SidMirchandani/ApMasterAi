"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";
import { getSectionInfo, getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";
import { percentageToAPScore } from "@/lib/ap-score-utils";
import { TestFloatingNav } from "./TestFloatingNav";
import { QuestionCard } from "./QuestionCard";
import { PracticeQuizQuestionCard } from "./PracticeQuizQuestionCard";
import { ExplanationPanel } from "./ExplanationPanel";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";

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
  /** When navigating to section-review, pass this as `returnTo` on full-length-history (e.g. "study") */
  sectionReviewReturnTo?: string;
  /** Whether app navbar is visible above this screen. */
  hasAppNav?: boolean;
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
  sectionReviewReturnTo,
  hasAppNav = true,
}: UnifiedQuizResultsReviewProps) {
  const router = useRouter();
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const apiCode = subject?.subjectCode || subjectId;
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const resultsHeaderTop = hasAppNav ? "top-[calc(3.75rem+1px)]" : "top-0";
  const resultsContentTop = hasAppNav
    ? "pt-[calc(3.75rem+1px+3.75rem+1px)]"
    : "pt-[calc(3.75rem+1px)]";

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  // Resolve display correct label (handles missing answerIndex via correct_answer)
  const getCorrectLabel = (q: Question): string => {
    if (q.answerIndex !== undefined && q.answerIndex >= 0 && q.answerIndex < 5) {
      return getDisplayCorrectLabel(q, mcqOptionCount);
    }
    const letter = (q as { correct_answer?: string }).correct_answer?.trim?.().toUpperCase?.();
    if (!letter || !/^[A-E]$/.test(letter)) return "";
    if (mcqOptionCount === 4 && letter === "E") return "D";
    return letter;
  };

  // Correct/incorrect per question (using display correct label for 4-option subjects)
  const correctMap = questions.reduce<Record<number, boolean>>((acc, q, i) => {
    const correctLabel = getCorrectLabel(q);
    const userAns = userAnswers[i] ?? userAnswers[String(i)];
    acc[i] = userAns === correctLabel;
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
      const correctLabel = getCorrectLabel(q);
      const userAns = userAnswers[i] ?? userAnswers[String(i)];
      if (userAns === correctLabel) map[code].correct++;
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
      const returnToParam = sectionReviewReturnTo
        ? `&returnTo=${encodeURIComponent(sectionReviewReturnTo)}`
        : "";
      router.push(
        `/section-review?subject=${subjectId}&testId=${testId}&section=${sectionCode}${mode}${returnToParam}`
      );
    } else {
      const firstIndex = questions.findIndex((q) => (q.section_code || "Unknown") === sectionCode);
      if (firstIndex >= 0) setSelectedQuestionIndex(firstIndex);
    }
  };

  // Question detail view: top "Close Review" bar + QuizBottomBar without Exit (single close action at top)
  if (selectedQuestionIndex !== null) {
    const q = questions[selectedQuestionIndex];
    if (!q) return null;
    const handleBackToResults = () => setSelectedQuestionIndex(null);
    const selectedAnswer = userAnswers[selectedQuestionIndex] ?? userAnswers[String(selectedQuestionIndex)] ?? null;
    const selectedCorrectLabel = getCorrectLabel(q);
    const isSelectedCorrect = !!selectedAnswer && selectedAnswer === selectedCorrectLabel;
    const isApClassroomSurface = isFullLength;

    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-[#0B0F1A]">
        <div className={`fixed left-0 right-0 z-50 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-[#0B0F1A] ${resultsHeaderTop}`}>
          <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5 sm:px-4">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Question {selectedQuestionIndex + 1} of {questions.length}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToResults}
              className="h-10 shrink-0 rounded-full px-4 text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              <X className="mr-1.5 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto pb-32 ${resultsContentTop}`}>
          <div className="mx-auto max-w-6xl px-2 py-0 sm:px-3">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_360px]">
              {isFullLength ? (
                <QuestionCard
                  question={q as any}
                  questionNumber={selectedQuestionIndex + 1}
                  selectedAnswer={selectedAnswer}
                  isFlagged={false}
                  onAnswerSelect={() => {}}
                  onToggleFlag={() => {}}
                  isFullLength
                  isAnswerSubmitted
                  isReviewMode
                  mcqOptionCount={mcqOptionCount}
                  examSurfaceVariant={isApClassroomSurface ? "apclassroom" : "default"}
                />
              ) : (
                <PracticeQuizQuestionCard
                  question={q as any}
                  questionNumber={selectedQuestionIndex + 1}
                  totalQuestions={questions.length}
                  selectedAnswer={selectedAnswer}
                  onAnswerSelect={() => {}}
                  isAnswerSubmitted
                  mcqOptionCount={mcqOptionCount}
                />
              )}

              <div className="md:sticky md:top-4 md:self-start">
                <ExplanationPanel hasAnswered={true} isCorrect={isSelectedCorrect}>
                  <p className="text-sm font-medium">
                    {isSelectedCorrect
                      ? "Correct."
                      : `Incorrect. The correct answer is ${selectedCorrectLabel}.`}
                  </p>
                  {q.explanation ? (
                    <PrettyExplanation className="prose prose-sm dark:prose-invert max-w-none">
                      {getDisplayExplanation(q.explanation, q, mcqOptionCount)}
                    </PrettyExplanation>
                  ) : null}
                </ExplanationPanel>
              </div>
            </div>
          </div>
        </div>
        <TestFloatingNav
          currentIndex={selectedQuestionIndex}
          totalQuestions={questions.length}
          userAnswers={userAnswers}
          flaggedQuestions={new Set<number>()}
          canGoPrevious={selectedQuestionIndex > 0}
          canGoNext={selectedQuestionIndex < questions.length - 1}
          onPrevious={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
          onNext={() => setSelectedQuestionIndex(Math.min(questions.length - 1, selectedQuestionIndex + 1))}
          onGoTo={setSelectedQuestionIndex}
          onEndReview={() => setSelectedQuestionIndex(null)}
        />
      </div>
    );
  }

  // Summary view: Close Review, score, grid, buttons, Review By Unit
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
      <div className={`fixed left-0 right-0 z-50 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-[#0B0F1A] ${resultsHeaderTop}`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5 sm:px-4">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Quiz results</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseReview}
            className="h-10 shrink-0 rounded-full px-4 text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          >
            <X className="mr-1.5 h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <div className={`mx-auto max-w-3xl space-y-4 px-2 pb-8 sm:px-3 ${resultsContentTop}`}>
        {/* Center-aligned score and review actions */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {score}/{totalQuestions} ({percentage}% Accuracy)
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {testId ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewSection("all", questions.length)}
                  className="h-10 rounded-full bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Review all questions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewSection("incorrect", incorrectIndices.length)}
                  disabled={incorrectIndices.length === 0}
                  className="h-10 rounded-full bg-slate-100 px-5 font-semibold text-slate-900 hover:bg-slate-200/80 disabled:opacity-50 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.09]"
                >
                  Review incorrect
                  {incorrectIndices.length > 0 && (
                    <span className="ml-1.5 text-slate-500">({incorrectIndices.length})</span>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedQuestionIndex(0)}
                  className="h-10 rounded-full bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Review all questions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (incorrectIndices.length > 0) setSelectedQuestionIndex(incorrectIndices[0]);
                  }}
                  disabled={incorrectIndices.length === 0}
                  className="h-10 rounded-full bg-slate-100 px-5 font-semibold text-slate-900 hover:bg-slate-200/80 disabled:opacity-50 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.09]"
                >
                  Review incorrect
                  {incorrectIndices.length > 0 && (
                    <span className="ml-1.5 text-slate-500">({incorrectIndices.length})</span>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Question grid: green = correct, red = incorrect */}
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-white/[0.06]">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {questions.map((_, index) => {
              const isCorrect = correctMap[index];
              const base =
                "aspect-square max-w-[55px] min-w-[36px] w-full rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90 cursor-pointer";
              const cls = isCorrect
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-red-500 text-white hover:bg-red-600";
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedQuestionIndex(index)}
                  className={`${base} ${cls}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {allSectionEntries.length > 0 && (
          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-white/[0.06]">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Review by unit</h2>
            <div className="space-y-2">
              {allSectionEntries.map(([code, sec]) => {
                const hasQuestions = sec.total > 0;
                const apResult = hasQuestions ? percentageToAPScore(sec.percentage ?? 0, apiCode) : null;
                const barWidth = `${Math.min(100, Math.max(0, sec.percentage ?? 0))}%`;
                const barFillColor = !hasQuestions
                  ? undefined
                  : apResult
                    ? apResult.color
                    : undefined;
                const barFillClass = !hasQuestions
                  ? "bg-slate-300 dark:bg-slate-600"
                  : barFillColor
                    ? ""
                    : "bg-emerald-500 dark:bg-emerald-500";
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleViewSection(code, sec.total)}
                    disabled={!hasQuestions}
                    className={`group flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors ${
                      hasQuestions
                        ? "cursor-pointer bg-white/80 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
                        : "cursor-not-allowed bg-white/40 opacity-60 dark:bg-white/[0.03]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate font-medium ${
                          hasQuestions ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        UNIT {sec.unitNumber || "?"}: {sec.name}
                        {!hasQuestions && " (No questions)"}
                      </div>
                      <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`absolute inset-y-0 left-0 min-w-[2px] rounded-full ${barFillClass}`}
                          style={{ width: barWidth, ...(barFillColor ? { backgroundColor: barFillColor } : {}) }}
                        />
                      </div>
                    </div>
                    {hasQuestions && (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
