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
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { useIsMobile } from "@/lib/hooks/useMobile";
import { getUnitsForSubject, getSubjectByCode, getApiCodeForSubject } from "@/subjects";
import { getPredictedAPScoreFromTests, computeProjectedPercentage, getTargetPercentagesForSubject, getUnitTierFromScore } from "@/lib/ap-score-utils";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-200 dark:border-emerald-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-12 max-w-xl">
          <div className="text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <HelpCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
              Subject not found
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              The requested subject was not found in your dashboard.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Navigation />

      {/* Hero header */}
      <div className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-500/5 dark:to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-6 max-w-6xl relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 -ml-2 mb-4 rounded-lg group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                {currentSubject.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
                {currentSubject.description}
              </p>

            </div>

            {/* Stat badges */}
            <div className="flex items-stretch gap-3 flex-shrink-0">
              <div
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-center justify-center gap-1 flex-shrink-0 min-h-0"
                title="Predicted AP Score"
              >
                <div
                  className="flex items-center justify-center w-14 h-14 rounded-full text-white text-2xl font-bold shadow-md"
                  style={{ backgroundColor: predicted ? predicted.color : "#94a3b8" }}
                >
                  {predicted ? predicted.score : "?"}
                </div>
                <APScoreExplainDialog inline triggerClassName="self-start mt-0.5" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-violet-50 dark:bg-violet-500/10 rounded-xl flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider leading-none">
                    Exam Date
                  </p>
                  <p className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                    {formatDate(subjectMeta?.metadata?.examDate ?? currentSubject.examDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
            Quick Actions
          </h2>

          {!hasCompletedDiagnostic ? (
            /* ── LAYOUT A: Onboarding State ── */
            <div className="space-y-4">

              {/* Row 1 — Hero Diagnostic CTA (full width) */}
              <button
                onClick={() => router.push(`/diagnostic?subject=${subjectId}`)}
                className="group relative overflow-hidden rounded-2xl p-6 w-full bg-red-600 text-white text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(220,38,38,0.4)] active:translate-y-0"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg leading-tight">Quick Diagnostic Test</p>
                    <p className="text-white/75 text-sm mt-1">25 adaptive questions · Get your projected AP score</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/60 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </button>

              {/* Row 2 — Secondary/Locked cards (2 columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MCQ Full-Length Test — secondary/discouraged */}
                <button
                  onClick={() => router.push(`/quiz?subject=${subjectId}&unit=full-length`)}
                  className="group relative overflow-hidden rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left transition-all duration-200 opacity-60 hover:opacity-80"
                >
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 text-slate-400 dark:text-slate-500 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-500 dark:text-slate-400 leading-tight">MCQ Full-Length Test</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Complete diagnostic first</p>
                    </div>
                  </div>
                </button>

                {/* Analytics — locked */}
                <button
                  disabled
                  className="group relative overflow-hidden rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left opacity-50 cursor-not-allowed"
                >
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-500 dark:text-slate-400 leading-tight">Analytics</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Take diagnostic to unlock</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Row 3 — Standard utility cards (3 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: Bookmark,
                    label: "Saved Questions",
                    desc: "Your bookmarked questions",
                    href: `/bookmarks?subject=${subjectId}`,
                    iconClass: "text-amber-600 dark:text-amber-400",
                    iconBg: "bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20",
                    borderHover: "hover:border-amber-200 dark:hover:border-amber-800/60",
                  },
                  {
                    icon: RotateCcw,
                    label: "Review Questions",
                    desc: "Questions you got wrong",
                    href: `/review?subject=${subjectId}`,
                    iconClass: "text-violet-600 dark:text-violet-400",
                    iconBg: "bg-violet-50 dark:bg-violet-500/10 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20",
                    borderHover: "hover:border-violet-200 dark:hover:border-violet-800/60",
                  },
                  {
                    icon: Clock,
                    label: "Test History",
                    desc: "Diagnostic & full-length results",
                    href: `/full-length-history?subject=${subjectId}`,
                    iconClass: "text-blue-600 dark:text-blue-400",
                    iconBg: "bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20",
                    borderHover: "hover:border-blue-200 dark:hover:border-blue-800/60",
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className={`group relative overflow-hidden rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 ${action.borderHover} text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${action.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 transition-colors`}>
                        <action.icon className={`w-5 h-5 ${action.iconClass}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{action.label}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{action.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

            </div>
          ) : (
            /* ── LAYOUT B: Core Study Loop ── */
            <div className="space-y-4">

              {/* Row 1 — Primary action pair (2 columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MCQ Full-Length Test — elevated primary CTA */}
                <button
                  onClick={() => router.push(`/quiz?subject=${subjectId}&unit=full-length`)}
                  className="group relative overflow-hidden rounded-2xl p-5 bg-emerald-500 text-white text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(16,185,129,0.35)] active:translate-y-0"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base leading-tight">MCQ Full-Length Test</p>
                      <p className="text-white/75 text-xs mt-0.5">Simulate real exam conditions</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </button>

                {/* Analytics — highlighted secondary CTA */}
                <button
                  onClick={() => router.push(`/analytics?subject=${subjectId}`)}
                  className="group relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                      <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Analytics</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Detailed performance data</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </button>
              </div>

              {/* Row 2 — Utility cards (2 cols on mobile → 4 cols on desktop) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
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
                    icon: RotateCcw,
                    label: "Review Questions",
                    desc: "Questions you got wrong",
                    href: `/review?subject=${subjectId}`,
                    iconClass: "text-violet-600 dark:text-violet-400",
                    iconBg: "bg-violet-50 dark:bg-violet-500/10 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20",
                    borderHover: "hover:border-violet-200 dark:hover:border-violet-800/60",
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
                    icon: Sparkles,
                    label: "Retake Diagnostic",
                    desc: "Re-baseline your score",
                    href: `/diagnostic?subject=${subjectId}`,
                    iconClass: "text-rose-600 dark:text-rose-400",
                    iconBg: "bg-rose-50 dark:bg-rose-500/10 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20",
                    borderHover: "hover:border-rose-200 dark:hover:border-rose-800/60",
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className={`group relative overflow-hidden rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 ${action.borderHover} text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${action.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 transition-colors`}>
                        <action.icon className={`w-5 h-5 ${action.iconClass}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{action.label}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{action.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

            </div>
          )}
        </div>

        {/* Units Grid */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.25)]">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  Course Content
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {totalTopics} units · {topicsMastered} mastered
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {units.map((unit, index) => {
              const unitData = getUnitData(unit.id);
              const score = unitData?.highestScore ?? unitData?.mcqScore ?? 0;
              const tierResult = getUnitTierFromScore(score, targets);
              const level = tierResult.label;
              const hasAttempted = score > 0;
              const isMastered = tierResult.tier === "5";

              const statusConfig = {
                Mastered: {
                  badge: "bg-emerald-500 text-white",
                  numBg: "bg-emerald-500 text-white",
                  barColor: "from-emerald-500 to-teal-500",
                  icon: Star,
                },
                Proficient: {
                  badge: "bg-green-500 text-white",
                  numBg: "bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                  barColor: "from-green-400 to-emerald-500",
                  icon: CheckCircle,
                },
                "In Progress": {
                  badge: "bg-amber-500 text-white",
                  numBg: "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
                  barColor: "from-amber-400 to-orange-400",
                  icon: Flame,
                },
                "Needs Practice": {
                  badge: "bg-orange-500 text-white",
                  numBg: "bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400",
                  barColor: "from-orange-400 to-amber-400",
                  icon: Flame,
                },
                Weak: {
                  badge: "bg-red-500 text-white",
                  numBg: "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400",
                  barColor: "from-red-400 to-orange-400",
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
                  className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-300 ${
                    isMastered
                      ? "border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700/60"
                      : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                  } hover:shadow-lg hover:-translate-y-0.5`}
                >
                  {/* Left colored accent */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${statusConfig.barColor} opacity-${isMastered ? "100" : "40"} group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  <div className="flex flex-col md:flex-row pl-4">
                    {/* Main content */}
                    <div className="p-5 flex-1 min-w-0">
                      <div className="flex items-start gap-4">
                        {/* Unit number */}
                        <div
                          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg ${statusConfig.numBg} transition-colors`}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Title + badge */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                              {unit.title}
                            </h3>
                            {hasAttempted && (
                              <Badge className={`${statusConfig.badge} border-none px-2 py-0.5 text-[10px] font-bold h-5 leading-none rounded-full`}>
                                {level}
                              </Badge>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs max-w-2xl">
                            {unit.description}
                          </p>

                          {/* Meta row */}
                          <div className="flex items-center gap-4 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Exam Weight: {unit.examWeight}
                            </span>
                            {hasAttempted && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${tierResult.textClass}`}>
                                <Target className="w-3 h-3" />
                                Best Score: {score}%
                              </span>
                            )}
                          </div>

                          {/* Score progress bar */}
                          {hasAttempted && (
                            <div className="pt-1 max-w-xs">
                              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

                    {/* CTA */}
                    <div className="px-5 pb-5 md:pb-0 md:w-52 flex items-center">
                      <Button
                        onClick={() => router.push(`/quiz?subject=${subjectId}&unit=${unit.id}`)}
                        className={`w-full h-11 font-bold rounded-xl transition-all duration-200 text-sm ${
                          isMastered
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.35)]"
                            : "bg-white dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 group-hover:shadow-md"
                        }`}
                      >
                        {isMastered ? (
                          <>
                            <Star className="w-4 h-4 mr-2 fill-current" />
                            Revisit
                          </>
                        ) : hasAttempted ? (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Keep Practicing
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Unit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
