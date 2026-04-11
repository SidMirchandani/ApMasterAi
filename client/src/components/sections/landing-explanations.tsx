"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LandingStoryContent, LandingStoryHeader, type LandingStoryMeta } from "@/components/sections/landing-story-header";
import { PracticeQuizQuestionCard } from "@/components/quiz/PracticeQuizQuestionCard";
import { ExplanationPanel } from "@/components/quiz/ExplanationPanel";
import { PrettyExplanation, QUIZ_EXPLANATION_CLASSNAME, QUIZ_QUESTION_EXPL_GRID_CLASS } from "@/components/ui/PrettyExplanation";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import {
  getDisplayChoicesAndCorrect,
  getDisplayCorrectLabel,
  getDisplayExplanation,
} from "@/lib/mcqDisplay";
import { getSubjectByCode } from "@/subjects";

const SUBJECT_CODE = "APBIO";

const defaultStory: LandingStoryMeta = {
  title: "Explanations You Actually Understand",
  subtitle:
    "Concept, why the keyed answer is correct, and why other options miss — Report on every item; Review queue tied to miss history.",
};

async function fetchBioQuestion() {
  const res = await fetch(`/api/questions?subject=${SUBJECT_CODE}&limit=1`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  const json = await res.json();
  if (!json.success || !json.data?.length) return [];
  return normalizeQuestions(json.data);
}

export function LandingExplanations({ story = defaultStory }: { story?: LandingStoryMeta }) {
  const headerMeta: LandingStoryMeta = { ...defaultStory, ...story };
  const revealRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["landing-explanations-demo", SUBJECT_CODE],
    queryFn: fetchBioQuestion,
    staleTime: 5 * 60 * 1000,
  });

  const q = questions[0];
  const subject = getSubjectByCode(SUBJECT_CODE);
  const mcq = subject?.metadata?.mcqOptionCount;

  const { displayCorrectLabel, choiceLabels } = useMemo(() => {
    if (!q) return { displayCorrectLabel: null as string | null, choiceLabels: [] as string[] };
    return getDisplayChoicesAndCorrect(q as any, mcq);
  }, [q, mcq]);

  const demoWrongLabel = useMemo(() => {
    if (!displayCorrectLabel || !choiceLabels.length) return null;
    return choiceLabels.find((l) => l !== displayCorrectLabel) ?? null;
  }, [displayCorrectLabel, choiceLabels]);

  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setRevealed(true);
      },
      { threshold: 0.3, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const correctLetter =
    q && displayCorrectLabel ? getDisplayCorrectLabel({ answerIndex: (q as any).answerIndex ?? 0 }, mcq) : "";

  return (
    <section
      id="landing-explanations"
      className="landing-band-muted landing-story-snap scroll-mt-20 border-t border-slate-100 py-16 md:py-24 dark:border-slate-800"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...headerMeta} />

        <LandingStoryContent>
          <div ref={revealRef} className="relative mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B0F1A]">
              {/* Tab rail: brand blue; active tab is white */}
              <div className="flex items-end justify-center bg-blue-600 px-2 pt-2 dark:bg-blue-950">
                <span
                  className="inline-flex min-w-[5.75rem] items-center justify-center rounded-t-lg border border-b-0 border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700/80 dark:bg-[#0B0F1A] dark:text-white"
                >
                  Review
                </span>
              </div>

              <div className="px-3 pb-4 pt-4 md:px-5 md:pb-5 md:pt-5">
                {isLoading && (
                  <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Loading…
                  </div>
                )}
                {!isLoading && q && demoWrongLabel && (
                  <div className={QUIZ_QUESTION_EXPL_GRID_CLASS}>
                    <div className="min-w-0">
                      <PracticeQuizQuestionCard
                        question={q as any}
                        questionNumber={1}
                        totalQuestions={8}
                        selectedAnswer={revealed ? demoWrongLabel : null}
                        onAnswerSelect={() => {}}
                        isAnswerSubmitted={revealed}
                        mcqOptionCount={mcq}
                        showQuestionCounter
                        onReport={() => {}}
                      />
                    </div>
                    <div className={`min-w-0 md:sticky md:top-4 ${revealed ? "md:self-start" : "md:self-stretch"}`}>
                      <ExplanationPanel
                        hasAnswered={revealed}
                        isCorrect={false}
                        showEmptyHint={false}
                        className={revealed ? "" : "h-full"}
                      >
                        {revealed && (
                          <>
                            <p className="text-[0.775rem] font-medium leading-relaxed">
                              {`Incorrect. The correct answer is ${correctLetter}.`}
                            </p>
                            {(q as { explanation?: string }).explanation ? (
                              <PrettyExplanation className={QUIZ_EXPLANATION_CLASSNAME}>
                                {getDisplayExplanation(
                                  (q as { explanation?: string }).explanation,
                                  { answerIndex: (q as { answerIndex: number }).answerIndex ?? 0 },
                                  mcq,
                                )}
                              </PrettyExplanation>
                            ) : null}
                          </>
                        )}
                      </ExplanationPanel>
                    </div>
                  </div>
                )}
                {!isLoading && !q && (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Question preview unavailable.
                  </p>
                )}
              </div>
            </div>
          </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
