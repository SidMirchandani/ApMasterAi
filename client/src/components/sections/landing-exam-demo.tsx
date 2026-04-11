"use client";

import { useState } from "react";
import { getSubjectDisplayName } from "../../../../lib/subject-display-names";
import { LandingStoryContent, LandingStoryHeader, type LandingStoryMeta } from "@/components/sections/landing-story-header";
import { cn } from "@/lib/utils";
import { ArrowRight, Calculator, ChevronLeft, ChevronRight, Clock, FileText } from "lucide-react";

/** Deterministic 60-question correct/incorrect strip */
function makeDemoGridPattern(): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < 60; i++) {
    out.push((i * 7 + 13) % 11 !== 0);
  }
  return out;
}

const DEMO_GRID = makeDemoGridPattern();
const DEMO_SCORE = DEMO_GRID.filter(Boolean).length;

const TOOL_ITEMS = [
  {
    icon: Calculator,
    title: "Desmos graphing calculator",
    desc: "Built in where the exam allows — same tool class as AP Calculus, Biology, Chemistry, and more.",
  },
  {
    icon: Clock,
    title: "Countdown timer",
    desc: "Section time stays visible so you practice under real pacing pressure.",
  },
  {
    icon: FileText,
    title: "Reference sheets",
    desc: "Official-style equation and reference PDFs open in-app (e.g. Biology, Chemistry, Physics, Stats).",
  },
];

const fullLengthStoryDefault: LandingStoryMeta = {
  title: "Full-Length, AP-Level Tests",
  subtitle:
    "Timed exams use the same exam-day tools we ship in-app: Desmos, a live section timer, and reference sheets when your subject allows them.",
};

const evaluationsStoryDefault: LandingStoryMeta = {
  title: "AP-Level Evaluations & Guidance",
  subtitle:
    "After each full-length run, see a question grid and unit breakdown aligned to the official course — so you know exactly where to drill next.",
};

/** @deprecated Use LandingFullLengthTests + LandingApLevelEvaluations in page composition */
export function LandingExamDemo() {
  return (
    <>
      <LandingFullLengthTests />
      <LandingApLevelEvaluations />
    </>
  );
}

export function LandingFullLengthTests({ story = fullLengthStoryDefault }: { story?: LandingStoryMeta }) {
  return (
    <section
      id="landing-full-length-tests"
      className="landing-band-light landing-story-snap scroll-mt-20 border-t border-slate-100 py-16 md:py-24 dark:border-slate-800"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
          <div className="grid gap-6 md:grid-cols-3">
            {TOOL_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#0B0F1A]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08]">
                  <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-display text-base font-bold capitalize text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}

export function LandingApLevelEvaluations({ story = evaluationsStoryDefault }: { story?: LandingStoryMeta }) {
  const [demoPanel, setDemoPanel] = useState(0);

  return (
    <section
      id="landing-ap-evaluations"
      className="landing-band-muted landing-story-snap scroll-mt-20 border-t border-slate-100 py-16 md:py-24 dark:border-slate-800"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
        <div className="relative w-full">
          {demoPanel === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#0B0F1A] md:p-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Question Grid</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {DEMO_SCORE}/60{" "}
                <span className="text-lg font-semibold text-slate-500">
                  ({Math.round((DEMO_SCORE / 60) * 100)}%)
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Correct and incorrect items are color-coded; in the app, each cell opens that item with full feedback.
              </p>
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-white/[0.04]">
                <div className="grid max-h-[min(32vh,220px)] grid-cols-8 gap-1.5 overflow-y-auto sm:grid-cols-10">
                  {DEMO_GRID.map((ok, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex aspect-square max-h-9 min-h-[30px] items-center justify-center rounded-md text-[11px] font-semibold",
                        ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white",
                      )}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#0B0F1A] md:p-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Review By Unit</p>
              <h3 className="mt-1 text-lg font-bold capitalize text-slate-900 dark:text-white">Where To Focus Next</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Sample breakdown for {getSubjectDisplayName("APBIO")} — each row maps to a course unit and reflects how we
                aggregate performance by official unit weight.
              </p>
              <div className="mt-5 space-y-2">
                {[
                  { unit: 1, name: "Chemistry of Life", pct: 82 },
                  { unit: 2, name: "Cell Structure & Function", pct: 71 },
                  { unit: 3, name: "Cellular Energetics", pct: 64 },
                  { unit: 4, name: "Cell Communication", pct: 58 },
                ].map((row) => (
                  <div
                    key={row.unit}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-white/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        UNIT {row.unit}: {row.name}
                      </p>
                      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {row.pct}%
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            {demoPanel > 0 && (
              <button
                type="button"
                onClick={() => setDemoPanel(0)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0B0F1A] dark:text-slate-100 dark:hover:bg-white/[0.06]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Question grid
              </button>
            )}
            {demoPanel === 0 && (
              <button
                type="button"
                onClick={() => setDemoPanel(1)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                Review by unit
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
