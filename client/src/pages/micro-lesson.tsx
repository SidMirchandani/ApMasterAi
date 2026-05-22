import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MicroLessonReader } from "@/components/fast-path/MicroLessonReader";
import {
  buildMicroLessonQuizUrl,
  type MicroLessonReturnFrom,
} from "@/lib/micro-lesson-flow";
import { getQuizExitPath } from "@/lib/quiz-return";
import { getApiCodeForSubject, getSectionByCode } from "@/subjects";
import type { MicroLessonRecord } from "../../../lib/micro-lessons-types";

export default function MicroLessonPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const subjectId = router.query.subject as string | undefined;
  const sectionCode = router.query.section as string | undefined;
  const unitId = router.query.unit as string | undefined;
  const from = router.query.from as MicroLessonReturnFrom | undefined;
  const goalParam = router.query.goal as string | undefined;
  const goalScore: 4 | 5 = goalParam === "5" ? 5 : 4;
  /** Opt-in only (Fast Path admin toggle passes primer=1). */
  const primer = router.query.primer === "1";

  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;
  const sectionInfo =
    subjectId && sectionCode ? getSectionByCode(subjectId, sectionCode) : undefined;

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  const { data, isLoading, isError } = useQuery<{
    success: boolean;
    data: MicroLessonRecord | null;
  }>({
    queryKey: ["microLesson", subjectCode, sectionCode],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/micro-lessons?subjectCode=${encodeURIComponent(subjectCode!)}&sectionCode=${encodeURIComponent(sectionCode!)}`,
      );
      if (!res.ok) throw new Error("Failed to load lesson");
      return res.json();
    },
    enabled: isAuthenticated && !!subjectCode && !!sectionCode && router.isReady,
    staleTime: 60_000,
  });

  const lesson = data?.data ?? null;

  const backHref = useMemo(() => {
    if (!subjectId) return "/dashboard";
    return getQuizExitPath(subjectId, from ?? "fast-path");
  }, [subjectId, from]);

  const startDrill = () => {
    if (!subjectId || !unitId) return;
    router.push(
      buildMicroLessonQuizUrl({
        subjectId,
        unitId,
        goal: goalScore,
        primer,
        from: from ?? "fast-path",
      }),
    );
  };

  const unitLabel = sectionInfo
    ? `Unit ${sectionInfo.unitNumber}: ${sectionInfo.name}`
    : sectionCode;

  if (loading || !router.isReady) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      </div>
    );
  }

  if (!subjectId || !sectionCode || !unitId) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">Missing lesson parameters.</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />
      <div className="border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="container mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <main>
        {isLoading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading lesson…</p>
        ) : isError || !lesson ? (
          <div className="mx-auto max-w-lg px-4 py-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No micro-lesson published for this unit yet. You can still start the drill.
            </p>
            <Button
              className="rounded-xl bg-blue-600"
              onClick={startDrill}
            >
              Start micro-drill
            </Button>
            <Button
              variant="ghost"
              className="mt-2 block w-full"
              onClick={() => router.push(backHref)}
            >
              Back to Fast Path
            </Button>
          </div>
        ) : (
          <MicroLessonReader
            title={lesson.title}
            unitLabel={unitLabel}
            estimatedReadMinutes={lesson.estimatedReadMinutes}
            blocks={lesson.blocks}
            onStartDrill={startDrill}
            onBack={() => router.push(backHref)}
            skipLabel="Skip to Fast Path"
          />
        )}
      </main>
      <SimpleFooter />
    </div>
  );
}
