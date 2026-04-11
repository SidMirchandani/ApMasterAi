"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingStoryContent, LandingStoryHeader, type LandingStoryMeta } from "@/components/sections/landing-story-header";
import { apSubjects } from "@/lib/ap-subjects";
import { formatDate } from "@/lib/date";

/** ~same relative speed as a 55s → 280s duration change, without resetting the animation timeline */
const MARQUEE_HOVER_PLAYBACK_RATE = 55 / 280;

function getMarqueeAnimation(el: HTMLElement): Animation | undefined {
  return el.getAnimations().find((a) => (a as CSSAnimation).animationName === "landing-marquee");
}

const defaultStory: LandingStoryMeta = {
  title: "Full Coverage of Up-to-Date Curriculum",
  subtitle:
    "Every supported course rotates below — aligned to current exam dates and unit structure. Hover the strip to slow it down.",
};

/**
 * Horizontal marquee of every AP course — same card styling as `/learn`, without dashboard CTAs.
 */
export function LandingCoursesGallery({ story = defaultStory }: { story?: LandingStoryMeta }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(
    () => [...apSubjects].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const loop = [...sorted, ...sorted];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cached: Animation | undefined;
    const resolveAnim = () => {
      if (!cached) cached = getMarqueeAnimation(el);
      return cached;
    };

    const onAnimStart = (ev: AnimationEvent) => {
      if (ev.animationName === "landing-marquee") cached = getMarqueeAnimation(el);
    };

    requestAnimationFrame(() => {
      resolveAnim();
    });

    const onEnter = () => {
      const a = resolveAnim();
      if (a) a.playbackRate = MARQUEE_HOVER_PLAYBACK_RATE;
    };
    const onLeave = () => {
      const a = resolveAnim();
      if (a) a.playbackRate = 1;
    };

    el.addEventListener("animationstart", onAnimStart);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("animationstart", onAnimStart);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      const a = resolveAnim();
      if (a) a.playbackRate = 1;
    };
  }, []);

  return (
    <section
      id="curriculum"
      className="landing-band-light landing-story-snap scroll-mt-20 border-t border-slate-100 py-16 md:py-24 dark:border-slate-800"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
        <div className="relative -mx-4 overflow-hidden md:-mx-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent dark:from-[#0B0F1A]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent dark:from-[#0B0F1A]" />
          <div ref={trackRef} className="landing-marquee-track py-1">
            {loop.map((subject, i) => (
              <article
                key={`${subject.id}-${i}`}
                className="group/card flex w-[280px] shrink-0 flex-col overflow-hidden rounded-3xl bg-slate-100 transition-colors duration-200 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09] sm:w-[300px]"
              >
                <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
                  <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {subject.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {subject.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 shrink-0 text-blue-600 opacity-80 dark:text-blue-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{subject.units} units</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 shrink-0 text-blue-600 opacity-80 dark:text-blue-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(subject.examDate)}
                      </span>
                    </span>
                  </div>
                </div>
                {/* Named group/card so only this card expands — not other `group` ancestors or sibling cards */}
                <div className="max-h-0 overflow-hidden transition-[max-height] duration-300 ease-out group-hover/card:max-h-[5.75rem]">
                  <div className="px-5 pb-5 pt-0">
                    <Button
                      asChild
                      variant="ghost"
                      className="h-11 w-full rounded-full bg-blue-600 font-semibold text-white shadow-none hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <Link href="/signup">
                        Sign up to access
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
