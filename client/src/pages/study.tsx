import { useState, useEffect } from "react";
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
  Bookmark,
  BarChart3,
  CalendarDays,
  Clock,
  Play,
  ChevronRight,
  Star,
  Flame,
  Lock,
  Sparkles,
  Crown,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { useIsMobile } from "@/lib/hooks/useMobile";
import { getUnitsForSubject, getSubjectByCode, getApiCodeForSubject } from "@/subjects";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { getPredictedAPScoreFromTests, computeProjectedPercentage, getTargetPercentagesForSubject, getUnitTierFromScore } from "@/lib/ap-score-utils";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";
import { APScoreCircle } from "@/components/ui/APScoreCircle";

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
  const isMobile = useIsMobile();

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
  const hasCompletedDiagnostic = testHistory.some((t) => t.type === "diagnostic");

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

  const { data: bookmarksForSubjectResponse } = useQuery<{ success: boolean; data: { unitId?: string }[] }>({
    queryKey: ["bookmarks", subjectId, "all"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/bookmarks?subjectId=${subjectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!subjectId && isAuthenticated && !!user,
    staleTime: 60000,
  });
  const bookmarksForSubject = bookmarksForSubjectResponse?.data || [];

  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;
  const targets = getTargetPercentagesForSubject(subjectCode);
  const { projectedPercentage, hasEnoughForPrediction } = computeProjectedPercentage({
    unitProgressMap,
    testHistory,
  });
  const predicted = hasEnoughForPrediction ? getPredictedAPScoreFromTests(projectedPercentage, subjectCode) : null;

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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <div className="text-center rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <HelpCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
              Subject not found
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              The requested subject was not found in your dashboard.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition-all duration-150 ease-out"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      <Navigation />

      {/* Hero header */}
      <div className="relative bg-white dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 overflow-hidden">

        <div className="container mx-auto px-4 py-3 max-w-6xl relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 -ml-2 mb-2 rounded-lg group transition-colors duration-150 ease-out"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight mb-0.5">
                {currentSubject.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs max-w-2xl leading-relaxed">
                {currentSubject.description}
              </p>
            </div>

            {/* Stat badges */}
            <div className="flex items-stretch gap-2 flex-shrink-0">
              <div
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-2"
                title="Predicted AP Score"
              >
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider leading-none">
                    Projected
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider leading-none">AP Score</p>
                    <APScoreExplainDialog inline triggerClassName="self-start" />
                  </div>
                </div>
                <APScoreCircle
                  score={predicted?.score ?? null}
                  color={predicted ? predicted.color : "#94a3b8"}
                  size="sm"
                />
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider leading-none">
                    Exam Date
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                    {formatDate(subjectMeta?.metadata?.examDate ?? currentSubject.examDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-6xl">

        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Quick Actions
          </h2>

            <div className="space-y-2">

              {/* Row 1 — Primary action pair (2 columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* MCQ Full-Length Test — elevated primary CTA */}
                <button
                  onClick={() => router.push(`/quiz?subject=${subjectId}&unit=full-length`)}
                  className="group relative overflow-hidden rounded-xl py-2.5 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-left transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md active:translate-y-0"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] leading-tight">{subjectId ? `${getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId)} Full Length MCQ Test` : "Full Length MCQ Test"}</p>
                      <p className="text-white/75 text-xs mt-0.5">Simulate real exam conditions</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </button>

                {/* Analytics — highlighted secondary CTA */}
                <button
                  onClick={() => router.push(`/analytics?subject=${subjectId}`)}
                  className="group relative overflow-hidden rounded-xl py-2.5 px-3 bg-white dark:bg-slate-900/70 border border-blue-200 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 text-left transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                      <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight">Analytics</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Detailed performance data</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </button>
              </div>

              {/* Row 2 — Utility cards (2 cols on mobile → 4 cols on desktop) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                {[
                  {
                    icon: RotateCcw,
                    label: "Review Questions",
                    desc: "Questions you got wrong",
                    descSize: "text-[11px]",
                    href: `/review?subject=${subjectId}`,
                    iconClass: "text-blue-600 dark:text-blue-400",
                    iconBg: "bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20",
                    borderHover: "hover:border-blue-200 dark:hover:border-blue-800/60",
                  },
                  {
                    icon: Bookmark,
                    label: "Saved Questions",
                    desc: "Your bookmarks",
                    href: `/bookmarks?subject=${subjectId}`,
                    iconClass: "text-amber-600 dark:text-amber-400",
                    iconBg: "bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20",
                    borderHover: "hover:border-amber-200 dark:hover:border-amber-800/60",
                  },
                  {
                    icon: Clock,
                    label: "Test History",
                    desc: "All your results",
                    href: `/full-length-history?subject=${subjectId}`,
                    iconClass: "text-blue-600 dark:text-blue-400",
                    iconBg: "bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20",
                    borderHover: "hover:border-blue-200 dark:hover:border-blue-800/60",
                  },
                  {
                    icon: Sparkles,
                    label: hasCompletedDiagnostic ? "Retake Diagnostic" : "Take Diagnostic",
                    desc: hasCompletedDiagnostic ? "Re-baseline your score" : "Get your projected AP score",
                    descSize: "text-[11px]",
                    href: `/diagnostic?subject=${subjectId}`,
                    iconClass: "text-red-600 dark:text-red-400",
                    iconBg: "bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20",
                    borderHover: "hover:border-red-200 dark:hover:border-red-800/60",
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className={`group relative overflow-hidden rounded-xl p-2.5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 ${action.borderHover} text-left transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${action.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 transition-colors`}>
                        <action.icon className={`w-4 h-4 ${action.iconClass}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[13px] text-slate-900 dark:text-white leading-tight truncate">{action.label}</p>
                        <p className={`text-slate-500 dark:text-slate-400 ${"descSize" in action ? action.descSize : "text-xs"} truncate hidden sm:block`}>{action.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

            </div>
        </div>

        {/* Units Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">
                Course Content
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {totalTopics} units · {topicsMastered} mastered
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
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
                  className={`group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/70 border transition-all duration-150 ease-out ${
                    isMastered
                      ? "border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700/60"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                  } hover:shadow-md hover:-translate-y-[1px]`}
                >
                  {/* Left colored accent */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${statusConfig.barColor} opacity-${isMastered ? "100" : "40"} group-hover:opacity-100 transition-opacity duration-150 ease-out`}
                  />

                  <div className="flex items-center pl-3">
                    {/* Main content */}
                    <div className="py-3 px-2 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {/* Unit number + crown when mastered */}
                        <div className="relative shrink-0">
                          {isMastered && (
                            <Crown
                              className="absolute -top-1 left-1/2 -translate-x-1/2 fill-[#FFD700] stroke-[#FFD700] pointer-events-none z-10"
                              size={13}
                              strokeWidth={2}
                              aria-hidden
                            />
                          )}
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${statusConfig.numBg} transition-colors`}
                          >
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          {/* Title + badge */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {unit.title}
                            </h3>
                            {hasAttempted && (
                              <Badge className={`${statusConfig.badge} border-none px-1.5 py-0 text-[11px] font-bold h-4 leading-none rounded-full`}>
                                {level}
                              </Badge>
                            )}
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-400">
                              Exam: {unit.examWeight}
                            </span>
                            {hasAttempted && (
                              <span className={`text-xs font-medium flex items-center gap-1 ${tierResult.textClass}`}>
                                <Target className="w-3 h-3" />
                                {score}%
                              </span>
                            )}
                            {hasAttempted && (
                              <div className="flex-1 max-w-[120px]">
                                <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${statusConfig.barColor} rounded-full transition-all duration-700`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="px-3 py-3 flex items-center flex-shrink-0">
                      <Button
                        onClick={() => router.push(`/quiz?subject=${subjectId}&unit=${unit.id}`)}
                        variant="outline"
                        size="sm"
                        title="Practice quiz for this unit"
                        className={`h-8 font-semibold rounded-lg transition-all duration-150 ease-out text-[13px] shrink-0 px-3 ${
                          isMastered
                            ? "bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-600 hover:text-white text-slate-900 dark:text-white"
                        }`}
                      >
                        <Play className="w-3 h-3 flex-shrink-0 mr-1" />
                        Practice Quiz
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <SimpleFooter />
    </div>
  );
}
