"use client";

import { Button } from "@/components/ui/button";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import type { MicroLessonBlock } from "../../../../lib/micro-lessons-types";
import { Clock, BookOpen } from "lucide-react";

export function MicroLessonReader({
  title,
  unitLabel,
  estimatedReadMinutes,
  blocks,
  onStartDrill,
  onBack,
  drillLabel = "Start micro-drill",
  skipLabel,
}: {
  title: string;
  unitLabel?: string;
  estimatedReadMinutes: number;
  blocks: MicroLessonBlock[];
  onStartDrill: () => void;
  onBack?: () => void;
  drillLabel?: string;
  skipLabel?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        {unitLabel ? (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {unitLabel}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4 shrink-0" />
          ~{estimatedReadMinutes} min read
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <BookOpen className="h-4 w-4 shrink-0" />
          Then 10-question drill
        </p>
      </div>

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <section
            key={i}
            className="rounded-2xl bg-slate-100 px-5 py-4 dark:bg-white/[0.06]"
          >
            {block.heading ? (
              <h2 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                {block.heading}
              </h2>
            ) : null}
            <PrettyExplanation className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {block.body}
            </PrettyExplanation>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          className="h-11 flex-1 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
          onClick={onStartDrill}
        >
          {drillLabel}
        </Button>
        {onBack && skipLabel ? (
          <Button variant="outline" className="h-11 rounded-xl" onClick={onBack}>
            {skipLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
