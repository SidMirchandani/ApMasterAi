"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Target } from "lucide-react";
import { LandingStoryContent, LandingStoryHeader, type LandingStoryMeta } from "@/components/sections/landing-story-header";
import { PracticeQuizQuestionCard } from "@/components/quiz/PracticeQuizQuestionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import { getDisplayChoicesAndCorrect } from "@/lib/mcqDisplay";
import { getTargetPercentagesForSubject, getUnitTierFromScore } from "@/lib/ap-score-utils";
import { getSubjectByLegacyId, getUnitsForSubject } from "@/subjects";
import { cn } from "@/lib/utils";

const LEGACY_ID = "macroeconomics";
const SUBJECT_CODE = "APMACRO";

const defaultStory: LandingStoryMeta = {
  title: "In-Depth Unit Quizzes",
  subtitle:
    "Practice one question at a time and watch unit mastery respond — same mechanics as the app (short preview below).",
};

async function fetchUnitQuestion() {
  const res = await fetch("/api/questions?subject=APMACRO&limit=1", { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  const json = await res.json();
  if (!json.success || !json.data?.length) return [];
  return normalizeQuestions(json.data);
}

export function LandingUnitQuizzes({ story = defaultStory }: { story?: LandingStoryMeta }) {
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["landing-unit-quiz-demo"],
    queryFn: fetchUnitQuestion,
    staleTime: 5 * 60 * 1000,
  });
  const q = questions[0];
  const subject = getSubjectByLegacyId(LEGACY_ID);
  const mcq = subject?.metadata?.mcqOptionCount;
  const targets = getTargetPercentagesForSubject(SUBJECT_CODE);
  const allUnits = getUnitsForSubject(SUBJECT_CODE);
  const units = allUnits.slice(0, 4);

  const [scores, setScores] = useState<number[]>(() => [78, 64, 52, 41]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [unit2Adjust, setUnit2Adjust] = useState<"up" | "down" | null>(null);

  const displayCorrect = q ? getDisplayChoicesAndCorrect(q as any, mcq).displayCorrectLabel : null;
  const isCorrect = selectedAnswer !== null && displayCorrect !== null && selectedAnswer === displayCorrect;

  useEffect(() => {
    if (!unit2Adjust) return;
    const from = 64;
    const to = unit2Adjust === "up" ? 90 : 45;
    const dur = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / dur);
      const ease = 1 - (1 - p) ** 2;
      const v = Math.round(from + (to - from) * ease);
      setScores((s) => {
        const next = [...s];
        next[1] = v;
        return next;
      });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [unit2Adjust]);

  const masteredCount = scores.filter((score) => getUnitTierFromScore(score, targets).tier === "5").length;

  const handleSubmit = () => {
    if (!selectedAnswer || isAnswerSubmitted || !q) return;
    setIsAnswerSubmitted(true);
    const correctLabel = getDisplayChoicesAndCorrect(q as any, mcq).displayCorrectLabel;
    setUnit2Adjust(selectedAnswer === correctLabel ? "up" : "down");
  };

  return (
    <section
      id="unit-quizzes"
      className="landing-band-light landing-story-snap scroll-mt-20 border-t border-slate-100 py-16 md:py-24 dark:border-slate-800"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="min-w-0 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#0B0F1A]">
              {isLoading && (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500">Loading…</div>
              )}
              {!isLoading && q && (
                <>
                  <PracticeQuizQuestionCard
                    question={q as any}
                    questionNumber={1}
                    totalQuestions={8}
                    selectedAnswer={selectedAnswer}
                    onAnswerSelect={setSelectedAnswer}
                    isAnswerSubmitted={isAnswerSubmitted}
                    mcqOptionCount={mcq}
                    showQuestionCounter
                  />
                  {!isAnswerSubmitted && (
                    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <Button
                        type="button"
                        className="w-full rounded-xl sm:w-auto"
                        disabled={!selectedAnswer}
                        onClick={handleSubmit}
                      >
                        Submit answer
                      </Button>
                    </div>
                  )}
                  {isAnswerSubmitted && (
                    <p
                      className={cn(
                        "mt-4 text-[0.8rem] font-semibold",
                        isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200",
                      )}
                    >
                      {isCorrect ? "Correct." : "Incorrect."}
                    </p>
                  )}
                </>
              )}
              {!isLoading && !q && <p className="text-sm text-slate-500">Sample question unavailable.</p>}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold capitalize tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Course Content
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {units.length} units · {masteredCount} mastered
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {units.map((unit, index) => {
                const score = scores[index] ?? 0;
                const tierResult = getUnitTierFromScore(score, targets);
                const level = tierResult.label;
                const hasAttempted = score > 0;
                const isMastered = tierResult.tier === "5";

                const statusConfig = {
                  Mastered: {
                    badge: "bg-green-700 dark:bg-green-800 text-white",
                    numBg: "bg-green-700 dark:bg-green-800 text-white",
                    barColor: "from-green-700 to-green-800",
                  },
                  Proficient: {
                    badge: "bg-green-600 text-white",
                    numBg: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300",
                    barColor: "from-green-500 to-green-600",
                  },
                  "In Progress": {
                    badge: "bg-green-300 dark:bg-green-400 text-green-900 dark:text-green-950",
                    numBg: "bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                    barColor: "from-green-300 to-green-400",
                  },
                  "Needs Practice": {
                    badge: "bg-red-400 dark:bg-red-500 text-white",
                    numBg: "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300",
                    barColor: "from-red-400 to-red-500",
                  },
                  Weak: {
                    badge: "bg-red-700 dark:bg-red-800 text-white",
                    numBg: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400",
                    barColor: "from-red-700 to-red-800",
                  },
                  "Not Started": {
                    badge: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                    numBg: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500",
                    barColor: "from-slate-300 to-slate-400",
                  },
                }[level] ?? {
                  badge: "bg-slate-200 text-slate-600",
                  numBg: "bg-slate-100 text-slate-400",
                  barColor: "from-slate-300 to-slate-400",
                };

                return (
                  <div
                    key={unit.id}
                    className="flex flex-col gap-2.5 rounded-2xl bg-slate-100 px-3.5 py-3 dark:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="relative shrink-0">
                        {isMastered && (
                          <Crown
                            className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 fill-[#FFD700] stroke-[#FFD700]"
                            size={13}
                            strokeWidth={2}
                            aria-hidden
                          />
                        )}
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${statusConfig.numBg}`}
                        >
                          {index + 1}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{unit.title}</h3>
                          {hasAttempted && (
                            <Badge
                              className={`h-5 border-0 px-2 text-[11px] font-bold leading-none ${statusConfig.badge} rounded-full`}
                            >
                              {level}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Exam weight {unit.examWeight}
                          </span>
                          {hasAttempted && (
                            <span className={`flex items-center gap-1 text-xs font-medium ${tierResult.textClass}`}>
                              <Target className="h-3 w-3" />
                              {score}%
                            </span>
                          )}
                          {hasAttempted && (
                            <div className="h-1.5 min-w-[100px] max-w-[160px] flex-1 rounded-full bg-white/80 dark:bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${statusConfig.barColor} transition-all duration-700`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
