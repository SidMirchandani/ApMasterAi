"use client";

import { useQuery } from "@tanstack/react-query";
import { useCountUp } from "@/hooks/use-count-up";

export type PlatformPublicStats = {
  totalStudents: number;
  totalSubjectEnrollments: number;
  questionBank: number;
  statesWithUsers: number;
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  computedAt: string;
};

async function fetchPlatformStats(): Promise<PlatformPublicStats> {
  const res = await fetch("/api/public/platform-stats");
  if (!res.ok) throw new Error("Failed to load stats");
  const json = await res.json();
  if (!json.success || !json.data) throw new Error("Invalid response");
  return json.data;
}

const COUNT_MS = 1800;

const HERO_KPIS = [
  { key: "students", line1: "Students", line2: "registered", pick: (d: PlatformPublicStats) => d.totalStudents },
  { key: "states", line1: "States", line2: "represented", pick: (d: PlatformPublicStats) => d.statesWithUsers },
  { key: "enrollments", line1: "Courses", line2: "enrolled", pick: (d: PlatformPublicStats) => d.totalSubjectEnrollments },
  { key: "quizzes", line1: "Quizzes", line2: "taken", pick: (d: PlatformPublicStats) => d.totalQuizzesTaken },
  { key: "bank", line1: "Question", line2: "bank", pick: (d: PlatformPublicStats) => d.questionBank },
  { key: "answered", line1: "Questions", line2: "answered", pick: (d: PlatformPublicStats) => d.totalQuestionsAnswered },
] as const;

function StatValue({ end, ready, isError }: { end: number; ready: boolean; isError: boolean }) {
  const enabled = ready && !isError;
  const animated = useCountUp(end, COUNT_MS, enabled);
  if (isError) return <span className="text-slate-400">—</span>;
  if (!ready) {
    return (
      <span
        className="inline-block h-7 min-w-[3rem] animate-pulse rounded-md bg-slate-200/90 dark:bg-slate-600/80"
        aria-hidden
      />
    );
  }
  return <>{animated.toLocaleString()}</>;
}

/**
 * Full-width hero stats: 2 per row on narrow phones, 3 per row sm–md, one row from lg.
 */
export function HeroPlatformStatsStrip({
  initialStats,
}: {
  initialStats?: PlatformPublicStats | null;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-platform-stats"],
    queryFn: fetchPlatformStats,
    initialData: initialStats ?? undefined,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const ready = !isLoading && !isError && !!data;

  return (
    <div
      className="w-full rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-4 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/50 sm:px-5 sm:py-5"
      aria-label="Platform usage stats"
    >
      <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-6 lg:divide-x lg:divide-slate-200/70 lg:dark:divide-slate-700/50">
        {HERO_KPIS.map((item) => {
          const end = data ? item.pick(data) : 0;
          return (
            <div key={item.key} className="min-w-0 px-1 text-center sm:px-2 lg:px-3">
              <p className="font-display text-xl font-bold tabular-nums leading-none text-slate-900 dark:text-white sm:text-2xl lg:text-[1.65rem]">
                <StatValue end={end} ready={ready} isError={isError} />
              </p>
              <p
                className="mt-2 flex min-h-[2.75em] flex-col justify-center gap-0 text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:text-xs"
                aria-label={`${item.line1} ${item.line2}`}
              >
                <span className="block">{item.line1}</span>
                <span className="block">{item.line2}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
