import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Target,
  CheckCircle,
  ArrowLeft,
  Trophy,
  HelpCircle,
  RotateCcw,
  BarChart3,
  CalendarDays,
  Play,
  ChevronRight,
  Star,
  Flame,
  Lock,
  Crown,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { getUnitsForSubject, getSubjectByCode, getApiCodeForSubject, getUnitWeightsBySectionCode } from "@/subjects";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { getPredictedAPScoreFromTests, getTargetPercentagesForSubject, getUnitTierFromScore } from "@/lib/ap-score-utils";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";
import { APScoreCircle } from "@/components/ui/APScoreCircle";
import { cn } from "@/lib/utils";

interface StudySubject {
  id: number;
  userId: number;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  examDate: string | number | Date | { seconds: number } | null;
  progress: number;
  masteryLevel: number;
  lastStudied?: string | number | Date | { seconds: number } | null;
  dateAdded?: string | number | Date | { seconds: number } | null;
  unitProgress?: {
    [unitId: string]: {
      status: string;
      highestScore: number;
      scores: number[];
      mcqScore?: number;
    };
  };
}

export default function Study() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [practiceMenuUnitId, setPracticeMenuUnitId] = useState<string | null>(null);
  const practiceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!practiceMenuUnitId) return;
    const onDown = (e: MouseEvent) => {
      const el = practiceMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setPracticeMenuUnitId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [practiceMenuUnitId]);

  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject)
    ? rawSubject[0] || undefined
    : rawSubject || undefined;

  const {
    data: subjectsResponse,
    isLoading: subjectsLoading,
    refetch,
  } = useQuery<{ success: boolean; data: StudySubject[] }>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/subjects");
      if (!response.ok) throw new Error("Failed to fetch subjects");
      return response.json();
    },
    enabled: isAuthenticated && !!user,
    refetchOnMount: "always",
  });

  const { data: adminCheck } = useQuery<{ success: boolean; data: { isAdmin: boolean; experimentalFeaturesEnabled?: boolean } }>({
    queryKey: ["adminCheck"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/admin-check");
      if (!res.ok) return { success: false, data: { isAdmin: false, experimentalFeaturesEnabled: false } };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = adminCheck?.data?.isAdmin ?? false;
  const showAdminFeatures = isAdmin && (adminCheck?.data?.experimentalFeaturesEnabled ?? false);

  const subjects: StudySubject[] = subjectsResponse?.data || [];
  const currentSubject: StudySubject | undefined = subjects.find(
    (s) => s.subjectId === subjectId
  );
  const subjectMeta = currentSubject ? getSubjectByCode(currentSubject.subjectId) : null;
  const units = currentSubject ? getUnitsForSubject(currentSubject.subjectId) : [];

  const { data: testHistoryResponse } = useQuery<{
    success: boolean;
    data: {
      percentage: number;
      type?: "full-length" | "diagnostic";
      sectionBreakdown?: Record<string, { correct: number; total: number }>;
    }[];
  }>({
    queryKey: ["testHistory", subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/test-history?subjectId=${subjectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!subjectId && isAuthenticated && !!user,
    staleTime: 60000,
  });
  const testHistory = testHistoryResponse?.data || [];

  const { data: unitProgressResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["unitProgress", subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/subjects/${subjectId}/unit-progress`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!subjectId && isAuthenticated && !!user,
    staleTime: 60000,
  });
  const unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }> =
    unitProgressResponse?.data || {};

  const { data: dueForSubjectResponse } = useQuery<{ success: boolean; data: { unitId?: string }[] }>({
    queryKey: ["dueReviews", subjectId, "all"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/questions/due?subjectId=${subjectId}&limit=500`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!subjectId && isAuthenticated && !!user,
    staleTime: 60000,
  });
  const dueForSubject = dueForSubjectResponse?.data || [];

  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;
  const targets = getTargetPercentagesForSubject(subjectCode);

  // Compute Student Score for prediction using the same idea as Analytics:
  // - Use unit weights when available (best-per-unit × weight, summed)
  // - Otherwise fall back to latest test percentage
  const unitBestMap: Record<string, number> = {};
  Object.entries(unitProgressMap).forEach(([code, prog]) => {
    unitBestMap[code] = Math.max(unitBestMap[code] ?? 0, prog.highestScore ?? prog.mcqScore ?? 0);
  });
  const unitPerformanceMap: { [sectionCode: string]: { correct: number; total: number } } = {};
  testHistory.forEach((test) => {
    if (test.sectionBreakdown) {
      Object.entries(test.sectionBreakdown).forEach(([code, section]) => {
        if (!unitPerformanceMap[code]) {
          unitPerformanceMap[code] = { correct: 0, total: 0 };
        }
        unitPerformanceMap[code].correct += section.correct;
        unitPerformanceMap[code].total += section.total;
      });
    }
  });
  Object.entries(unitPerformanceMap).forEach(([code, stats]) => {
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    unitBestMap[code] = Math.max(unitBestMap[code] ?? 0, pct);
  });

  const unitWeights = subjectId ? getUnitWeightsBySectionCode(subjectId) : {};
  const hasWeights = Object.keys(unitWeights).length > 0;

  let studentScore = 0;
  let hasEnoughForPrediction = false;

  if (hasWeights && Object.values(unitBestMap).some((v) => v > 0)) {
    const weightedScore = Object.entries(unitWeights).reduce(
      (sum, [code, weight]) => sum + ((unitBestMap[code] ?? 0) / 100) * weight,
      0
    );
    studentScore = Math.round(weightedScore);
    hasEnoughForPrediction = true;
  } else if (testHistory.length > 0) {
    studentScore = Math.round(testHistory[testHistory.length - 1].percentage);
    hasEnoughForPrediction = true;
  }

  const predicted = hasEnoughForPrediction
    ? getPredictedAPScoreFromTests(studentScore, subjectCode)
    : null;

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!subjectId) router.push("/dashboard");
  }, [subjectId, router]);

  const getUnitData = (unitId: string) => {
    return (currentSubject?.unitProgress || {})[unitId];
  };

  if (loading || subjectsLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-3xl bg-slate-100 px-6 py-10 text-center dark:bg-white/[0.06]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/80 dark:bg-white/[0.08]">
              <HelpCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Subject not found
            </h1>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              The requested subject was not found in your dashboard.
            </p>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="h-11 rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const topicsMastered = units.filter((unit) => {
    const unitData = currentSubject.unitProgress?.[unit.id];
    const score = unitData?.highestScore ?? unitData?.mcqScore ?? 0;
    const tierResult = getUnitTierFromScore(score, targets);
    return tierResult.tier === "5";
  }).length;
  const totalTopics = units.length;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-6">
        <header className="mb-5 md:mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="-ml-1 mb-3 h-9 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] hover:text-blue-600 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-blue-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>

          <div className="flex flex-col gap-3">
            <div className="min-w-0 w-full max-w-full space-y-1.5">
              <p className="text-sm font-medium text-blue-600/90 dark:text-blue-400/90">Study</p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {currentSubject.name}
              </h1>
              <p className="max-w-full text-pretty text-[15px] leading-relaxed text-slate-600 dark:text-slate-400 sm:max-w-2xl">
                {currentSubject.description}
              </p>
            </div>

            <div className="flex w-full flex-shrink-0 flex-wrap justify-center gap-2 sm:justify-start">
              <div
                className="flex items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2.5 dark:bg-white/[0.06]"
                title="Predicted AP Score"
              >
                <APScoreCircle
                  score={predicted?.score ?? null}
                  color={predicted ? predicted.color : "#94a3b8"}
                  size="sm"
                />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Projected
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      AP score
                    </p>
                    <APScoreExplainDialog inline triggerClassName="mt-0" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2.5 dark:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-white/[0.08]">
                  <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Exam date
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(subjectMeta?.metadata?.examDate ?? currentSubject.examDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-5">

        {/* Quick actions */}
        <section>
          <div className="mb-2">
            <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Quick actions
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => router.push(`/quiz?subject=${subjectId}&unit=full-length`)}
              className="group flex items-center gap-2.5 rounded-2xl bg-blue-600 px-3 py-2.5 text-left text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight">
                  {subjectId
                    ? `${getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId)} full-length MCQ`
                    : "Full-length MCQ"}
                </p>
                <p className="mt-0.5 text-xs text-white/80">Exam-style timing</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => router.push(`/analytics?subject=${subjectId}`)}
              className="group flex items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 dark:bg-white/[0.08]">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white">Analytics</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Performance detail</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </button>

            {showAdminFeatures ? (
              <button
                type="button"
                onClick={() => router.push(`/dualpath?subject=${subjectId}`)}
                className="group flex items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 dark:bg-white/[0.08]">
                  <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white">
                    DualPath <span className="text-red-500 dark:text-red-400">(beta)</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Study plan</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push(`/full-length-history?subject=${subjectId}&from=study`)}
                className="group flex items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 dark:bg-white/[0.08]">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white">Quiz & test history</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Past results</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push(`/review?subject=${subjectId}`)}
              className="group flex items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 dark:bg-white/[0.08]">
                <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white">Review questions</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Due for review</p>
              </div>
            </button>
          </div>
        </section>

        {/* Units */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Course content
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalTopics} units · {topicsMastered} mastered
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {units.map((unit, index) => {
              const unitData = getUnitData(unit.id);
              const score = unitData?.highestScore ?? unitData?.mcqScore ?? 0;
              const tierResult = getUnitTierFromScore(score, targets);
              const level = tierResult.label;
              const hasAttempted = score > 0;
              const isMastered = tierResult.tier === "5";
              /* 5-scale: Mastered=dark green, Proficient=medium green, In Progress=light green, Needs Practice=light red, Weak=dark red */
              const statusConfig = {
                Mastered: {
                  badge: "bg-green-700 dark:bg-green-800 text-white",
                  numBg: "bg-green-700 dark:bg-green-800 text-white",
                  barColor: "from-green-700 to-green-800",
                  icon: Star,
                },
                Proficient: {
                  badge: "bg-green-600 text-white",
                  numBg: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300",
                  barColor: "from-green-500 to-green-600",
                  icon: CheckCircle,
                },
                "In Progress": {
                  badge: "bg-green-300 dark:bg-green-400 text-white",
                  numBg: "bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                  barColor: "from-green-300 to-green-400",
                  icon: Flame,
                },
                "Needs Practice": {
                  badge: "bg-red-400 dark:bg-red-500 text-white",
                  numBg: "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300",
                  barColor: "from-red-400 to-red-500",
                  icon: Flame,
                },
                Weak: {
                  badge: "bg-red-700 dark:bg-red-800 text-white",
                  numBg: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400",
                  barColor: "from-red-700 to-red-800",
                  icon: Flame,
                },
                "Not Started": {
                  badge: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                  numBg: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500",
                  barColor: "from-slate-300 to-slate-400",
                  icon: Lock,
                },
              }[level] ?? {
                badge: "bg-slate-200 text-slate-600",
                numBg: "bg-slate-100 text-slate-400",
                barColor: "from-slate-300 to-slate-400",
                icon: BookOpen,
              };

              return (
                <div
                  key={unit.id}
                  className="flex flex-col gap-2.5 rounded-2xl bg-slate-100 px-3.5 py-3 transition-colors hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
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
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${statusConfig.numBg}`}>
                        {index + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
                          {unit.title}
                        </h3>
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

                  <div
                    ref={practiceMenuUnitId === unit.id ? practiceMenuRef : undefined}
                    className="relative isolate mx-auto w-full max-w-[min(100%,17rem)] shrink-0 self-center sm:mx-0 sm:w-auto sm:max-w-none sm:min-w-[188px] sm:self-center"
                  >
                    {/* Grid stack keeps controls in a fixed h-10 band (no absolute overflow over the card). */}
                    <div className="grid h-9 w-full grid-cols-1 grid-rows-1 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "col-start-1 row-start-1 flex min-h-0 min-w-0 justify-center transition-all duration-300 ease-out sm:justify-start",
                          practiceMenuUnitId === unit.id
                            ? "pointer-events-none scale-[0.92] opacity-0"
                            : "scale-100 opacity-100",
                        )}
                      >
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() =>
                            setPracticeMenuUnitId((id) => (id === unit.id ? null : unit.id))
                          }
                          size="sm"
                          title="Practice quiz for this unit"
                          className={cn(
                            "h-9 min-w-0 flex-1 rounded-full px-3.5 text-[13px] font-semibold",
                            isMastered
                              ? "bg-white/80 text-slate-600 hover:!bg-white hover:!text-slate-900 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:!bg-white/[0.12] dark:hover:!text-slate-200"
                              : "bg-blue-600 !text-white hover:!bg-blue-700 hover:!text-white dark:bg-blue-500 dark:hover:!bg-blue-600 dark:hover:!text-white",
                          )}
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                          Practice
                        </Button>
                      </div>
                      <div
                        className={cn(
                          "col-start-1 row-start-1 flex min-h-0 min-w-0 items-stretch justify-center gap-1.5 transition-all duration-300 ease-out sm:justify-end",
                          practiceMenuUnitId === unit.id
                            ? "scale-100 opacity-100"
                            : "pointer-events-none scale-[0.92] opacity-0",
                        )}
                      >
                        {([8, 15, 25] as const).map((n, i) => (
                          <Button
                            key={n}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPracticeMenuUnitId(null);
                              router.push(
                                `/quiz?subject=${subjectId}&unit=${unit.id}&limit=${n}`,
                              );
                            }}
                            style={{
                              transitionDelay:
                                practiceMenuUnitId === unit.id ? `${i * 45}ms` : "0ms",
                            }}
                            className={cn(
                              "h-9 min-w-0 flex-1 rounded-full px-2 text-xs font-bold transition-all duration-200 ease-out sm:max-w-[4.1rem] sm:flex-1",
                              isMastered
                                ? "bg-white !text-slate-700 ring-1 ring-slate-200 hover:!bg-slate-50 hover:!text-slate-800 dark:bg-white/[0.08] dark:!text-slate-200 dark:ring-white/10 dark:hover:!bg-white/[0.12] dark:hover:!text-slate-100"
                                : "bg-blue-600 !text-white hover:!bg-blue-700 hover:!text-white dark:bg-blue-500 dark:hover:!bg-blue-600 dark:hover:!text-white",
                            )}
                          >
                            {n}q
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}
