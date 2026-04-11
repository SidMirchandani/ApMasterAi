"use client";

import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  History,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  LandingStoryContent,
  LandingStoryHeader,
  type LandingStoryMeta,
} from "@/components/sections/landing-story-header";
import { getSubjectByCode } from "@/subjects";
import { cn } from "@/lib/utils";

const defaultStory = {
  title: "Per-Subject Study Hub",
  tone: "onBrand" as const,
};

type ActionId = "full" | "analytics" | "history" | "review";

const BLURBS: Record<ActionId, { title: string; body: string }> = {
  full: {
    title: "Full-Length MCQ",
    body: "Timed sections with the Digital AP layout: section clock, item navigator, and Desmos plus reference sheets when the subject allows.",
  },
  analytics: {
    title: "Analytics",
    body: "Unit mastery, accuracy trends, and loss patterns computed from your attempts — weighted by how the exam scores each unit.",
  },
  history: {
    title: "Quiz & Test History",
    body: "Diagnostics, unit quizzes, and full-length attempts stored with scores, dates, and drill-down into results and section review.",
  },
  review: {
    title: "Review Questions",
    body: "Missed items and spaced-repetition due dates in one queue, synced to your subject’s Review pipeline.",
  },
};

export function LandingStudyPreview({ story: storyProp }: { story?: Partial<LandingStoryMeta> }) {
  const meta = getSubjectByCode("APBIO")!.metadata;
  const [active, setActive] = useState<ActionId>("full");

  const story: LandingStoryMeta = {
    ...storyProp,
    title: storyProp?.title ?? defaultStory.title,
    tone: storyProp?.tone ?? defaultStory.tone,
    subtitle:
      storyProp?.subtitle ??
      `Study centers each enrolled course — here, ${meta.displayName}: full-length MCQs, Analytics, attempt history, and Review.`,
  };

  const actions: {
    id: ActionId;
    icon: typeof Play;
    title: string;
    sub: string;
    className: string;
    iconWrap: string;
    iconClass?: string;
  }[] = [
    {
      id: "full",
      icon: Play,
      title: `${meta.displayName} Full-Length MCQ`,
      sub: "Exam-style timing",
      className:
        "bg-white text-blue-900 shadow-sm dark:border dark:border-blue-400/30 dark:bg-blue-600 dark:text-white dark:shadow-lg dark:shadow-blue-950/40",
      iconWrap: "bg-blue-600/10 dark:bg-white/20",
      iconClass: "text-blue-600 dark:text-white",
    },
    {
      id: "analytics",
      icon: BarChart3,
      title: "Analytics",
      sub: "Performance detail",
      className: "border border-white/25 bg-white/15 text-white hover:bg-white/20",
      iconWrap: "bg-white/20",
      iconClass: "text-white",
    },
    {
      id: "history",
      icon: History,
      title: "Quiz & Test History",
      sub: "Past results",
      className: "border border-white/25 bg-white/15 text-white hover:bg-white/20",
      iconWrap: "bg-white/20",
      iconClass: "text-white",
    },
    {
      id: "review",
      icon: RotateCcw,
      title: "Review Questions",
      sub: "Due for review",
      className: "border border-white/25 bg-white/15 text-white hover:bg-white/20",
      iconWrap: "bg-white/20",
      iconClass: "text-white",
    },
  ];

  const blurb = BLURBS[active];

  return (
    <section
      id="study-hub"
      className="landing-story-snap scroll-mt-20 border-t border-blue-500/20 bg-blue-600 py-16 text-white md:py-24 dark:border-blue-950/35 dark:bg-[#0a1628]"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-base font-display font-bold capitalize tracking-tight text-white">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actions.map((row) => {
                const isSel = active === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setActive(row.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-[border,ring,background] ring-offset-2 ring-offset-blue-600 dark:ring-offset-[#0a1628]",
                      row.className,
                      isSel &&
                        (row.id === "review"
                          ? "border-2 border-slate-300/90 ring-0 dark:border-slate-400/80"
                          : "ring-2 ring-white/90 dark:ring-blue-300/90"),
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        row.iconWrap,
                      )}
                    >
                      <row.icon className={cn("h-4 w-4", row.iconClass || "text-white")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[12px] font-bold leading-tight",
                          row.id === "full" ? "text-blue-950 dark:text-white" : "text-white",
                        )}
                      >
                        {row.title}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[11px]",
                          row.id === "full" ? "text-blue-800/90 dark:text-blue-100/90" : "text-blue-100/90",
                        )}
                      >
                        {row.sub}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 opacity-80",
                        row.id === "full" ? "text-blue-700 dark:text-white/90" : "text-white/90",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="min-h-[220px] flex-1 rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm dark:border-white/15 dark:bg-white/5 lg:max-w-md lg:shrink-0">
            <div className="mb-2 flex items-center gap-2 text-blue-100 dark:text-blue-200/90">
              <BookOpen className="h-4 w-4 shrink-0 text-white" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">What We Include</span>
            </div>
            <h4 className="font-display text-lg font-bold capitalize text-white">{blurb.title}</h4>
            <p className="mt-3 text-sm leading-relaxed text-blue-50 dark:text-blue-100/95">{blurb.body}</p>
          </aside>
        </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
