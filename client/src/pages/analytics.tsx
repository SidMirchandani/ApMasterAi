import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  CheckCircle,
  XCircle,
  Crown,
} from "lucide-react";
import { APScoreCircle } from "@/components/ui/APScoreCircle";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getApiCodeForSubject, getSectionByCode, getUnitWeightsBySectionCode } from "@/subjects";
import { getProjectedAPScoreDisplay, getTargetPercentagesForSubject, getUnitTierFromScore, getAPScoreColor, percentageToAPScore } from "@/lib/ap-score-utils";
import { safeDateParse } from "@/lib/date";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";
import { AdminReadOnlyReturnBar } from "@/components/admin/AdminReadOnlyReturnBar";

interface TestHistoryEntry {
  testNumber: number;
  id: string;
  date: any;
  score: number;
  percentage: number;
  totalQuestions: number;
  subjectId: string;
  type?: "full-length" | "diagnostic" | "unit";
  unitId?: string;
  sectionCode?: string;
  unitNumber?: number;
  sectionBreakdown?: {
    [key: string]: {
      name: string;
      unitNumber: number;
      correct: number;
      total: number;
      percentage: number;
    };
  };
}

export default function AnalyticsPage({
  adminReadOnlyTargetUserId,
}: {
  adminReadOnlyTargetUserId?: string;
} = {}) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = router.query.subject as string | undefined;
  const isAdminReadOnly = Boolean(adminReadOnlyTargetUserId);
  const encodedTargetUserId = adminReadOnlyTargetUserId
    ? encodeURIComponent(adminReadOnlyTargetUserId)
    : "";
  const adminUserBasePath = encodedTargetUserId ? `/admin/users/${encodedTargetUserId}` : "";
  const studyPath = subjectId
    ? isAdminReadOnly
      ? `${adminUserBasePath}/study?subject=${subjectId}`
      : `/study?subject=${subjectId}`
    : isAdminReadOnly
      ? `${adminUserBasePath}/dashboard`
      : "/dashboard";
  const historyPath =
    subjectId && isAdminReadOnly
      ? `${adminUserBasePath}/full-length-history?subject=${subjectId}&from=analytics`
      : subjectId
        ? `/full-length-history?subject=${subjectId}&from=analytics`
        : "";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: testHistoryResponse, isLoading } = useQuery<{
    success: boolean;
    data: TestHistoryEntry[];
  }>({
    queryKey: isAdminReadOnly
      ? ["adminUserTestHistory", adminReadOnlyTargetUserId, subjectId || "all"]
      : ["testHistory", subjectId || "all"],
    queryFn: async () => {
      const url = isAdminReadOnly
        ? subjectId
          ? `/api/admin/users/${encodedTargetUserId}/test-history?subjectId=${subjectId}`
          : `/api/admin/users/${encodedTargetUserId}/test-history`
        : subjectId
          ? `/api/user/test-history?subjectId=${subjectId}`
          : "/api/user/test-history";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch test history");
      return res.json();
    },
    enabled: isAuthenticated && (isAdminReadOnly || !!user),
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

  const testHistory = testHistoryResponse?.data || [];

  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;
  const subjectDisplayName = subjectId
    ? getSubjectDisplayName(subjectCode ?? subjectId ?? "")
    : undefined;
  const { target2, target3, target4, target5 } = getTargetPercentagesForSubject(subjectCode);

  // --- Fetch unitProgress (includes diagnostic per-unit scores) ---
  const { data: unitProgressResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: isAdminReadOnly
      ? ["adminUserUnitProgress", adminReadOnlyTargetUserId, subjectId]
      : ["unitProgress", subjectId],
    queryFn: async () => {
      const url = isAdminReadOnly
        ? `/api/admin/users/${encodedTargetUserId}/subjects/${subjectId}/unit-progress`
        : `/api/user/subjects/${subjectId}/unit-progress`;
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch unit progress");
      return res.json();
    },
    enabled: isAuthenticated && (isAdminReadOnly || !!user) && !!subjectId,
  });
  const unitProgressMap: Record<string, { highestScore: number; mcqScore?: number }> =
    unitProgressResponse?.data || {};

  // --- Per-unit best percentage (max of diagnostic unitProgress and test history sectionBreakdown) ---
  const unitBestMap: Record<string, number> = {};
  // Seed from unitProgress (which includes diagnostic saves)
  Object.entries(unitProgressMap).forEach(([code, prog]) => {
    unitBestMap[code] = Math.max(unitBestMap[code] ?? 0, prog.highestScore ?? prog.mcqScore ?? 0);
  });
  // Also incorporate sectionBreakdown aggregated from test history
  const unitPerformanceMap: { [sectionCode: string]: { correct: number; total: number } } = {};
  testHistory.forEach(test => {
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

  // Merge unit codes from both unitBestMap and unitPerformanceMap for complete unit list
  const allUnitCodes = new Set([...Object.keys(unitBestMap), ...Object.keys(unitPerformanceMap)]);
  const unitEntries = Array.from(allUnitCodes)
    .map((code) => {
      const sectionInfo = subjectId ? getSectionByCode(subjectId, code) : undefined;
      const displayName = sectionInfo?.name ?? code;
      const unitNumber = sectionInfo?.unitNumber;
      const stats = unitPerformanceMap[code];
      const testPct = stats?.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const bestPct = unitBestMap[code] ?? testPct;
      return {
        code,
        name: displayName,
        unitNumber,
        correct: stats?.correct ?? 0,
        total: stats?.total ?? 0,
        percentage: bestPct,
      };
    })
    .filter((e) => e.percentage > 0 || e.total > 0)
    .sort((a, b) => (a.unitNumber ?? 999) - (b.unitNumber ?? 999));

  // Same 5-scale fill colors as dashboard/study for Performance by Unit bars
  const TIER_FILL_CLASS: Record<string, string> = {
    "1": "[&>div]:bg-red-700 [&>div]:dark:bg-red-800",
    "2": "[&>div]:bg-red-400 [&>div]:dark:bg-red-500",
    "3": "[&>div]:bg-green-300 [&>div]:dark:bg-green-400",
    "4": "[&>div]:bg-green-600 [&>div]:dark:bg-green-600",
    "5": "[&>div]:bg-green-700 [&>div]:dark:bg-green-800",
    none: "[&>div]:bg-slate-400 [&>div]:dark:bg-slate-500",
  };

  // Build chart data with the same numbering rules as Test History:
  // - Diagnostic quiz is always test #1 (if present)
  // - All other tests are numbered starting from #2
  // - Non-diagnostic tests are ordered oldest → newest
  const toMs = (t: TestHistoryEntry) => safeDateParse(t.date)?.getTime() ?? 0;
  const diagnosticTests = testHistory.filter((t) => t.type === "diagnostic").sort((a, b) => toMs(a) - toMs(b));
  const diagnostic = diagnosticTests[0];
  const otherTests = testHistory
    .filter((t) => t !== diagnostic)
    .sort((a, b) => toMs(a) - toMs(b)); // oldest first

  const numberedTests: (TestHistoryEntry & { displayTestNumber: number })[] = (() => {
    if (!diagnostic) {
      return otherTests.map((t, i) => ({ ...t, displayTestNumber: i + 1 }));
    }
    return [
      { ...(diagnostic as TestHistoryEntry), displayTestNumber: 1 },
      ...otherTests.map((t, i) => ({ ...t, displayTestNumber: i + 2 })),
    ];
  })();

  // Unit weights for weighted subject score (sectionCode -> 0-100, sum ~= 100)
  const unitWeights = subjectId ? getUnitWeightsBySectionCode(subjectId) : {};
  const hasWeights = Object.keys(unitWeights).length > 0;

  // Build weighted Student Score over time. For each test we:
  // - update per-unit best scores using that test's breakdown
  // - compute a weighted subject score = sum(bestPerUnit[code] * weight / 100)
  // - compute Score Impact as the change in that weighted score since the last test
  const bestPerUnitForTimeline: Record<string, number> = {};
  let lastTotalScoreForImpact = 0;

  const testChartData = numberedTests.map((test) => {
    if (hasWeights) {
      if (test.type === "unit" && test.sectionCode) {
        const prev = bestPerUnitForTimeline[test.sectionCode] ?? 0;
        bestPerUnitForTimeline[test.sectionCode] = Math.max(prev, test.percentage);
      } else if (test.sectionBreakdown) {
        Object.entries(test.sectionBreakdown).forEach(([code, section]) => {
          const pct = section.total > 0 ? Math.round((section.correct / section.total) * 100) : 0;
          const prev = bestPerUnitForTimeline[code] ?? 0;
          bestPerUnitForTimeline[code] = Math.max(prev, pct);
        });
      }
    }

    const totalScore = (() => {
      // For diagnostic, show the actual quiz score as Student Score so it matches "Quiz score" (no mismatch)
      if (test.type === "diagnostic") return Math.round(test.percentage);
      if (!hasWeights) return Math.round(test.percentage);
      const weightedScore = Object.entries(unitWeights).reduce(
        (sum, [code, weight]) => sum + ((bestPerUnitForTimeline[code] ?? 0) / 100) * weight,
        0
      );
      return Math.round(weightedScore);
    })();

    const rawImpact = totalScore - lastTotalScoreForImpact;
    const scoreImpact = test.type === "diagnostic" ? null : rawImpact;
    lastTotalScoreForImpact = totalScore;

    return {
      testNumber: test.displayTestNumber,
      percentage: totalScore,
      scoreImpact,
      quizScore: test.percentage,
      score: test.score,
      totalQuestions: test.totalQuestions,
      date: test.date,
      type: test.type || "full-length",
      unitId: test.unitId,
      sectionCode: test.sectionCode,
      unitNumber:
        test.unitNumber ??
        (test.sectionBreakdown && test.sectionCode
          ? test.sectionBreakdown[test.sectionCode]?.unitNumber
          : undefined),
      sectionName: test.sectionBreakdown?.[test.sectionCode ?? ""]?.name,
    };
  });

  const projectionState = getProjectedAPScoreDisplay({
    unitProgressMap,
    testHistory,
    unitWeights,
    subjectCode,
  });
  const predicted = projectionState.predicted;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500 dark:border-t-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />
      {isAdminReadOnly && <AdminReadOnlyReturnBar />}

      <div className="container mx-auto max-w-5xl px-4 py-4">
        <div className="mb-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {subjectDisplayName ? `${subjectDisplayName}: Analytics` : "Analytics"}
          </h1>
        </div>

        {testHistory.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <BarChart3 className="h-8 w-8 text-slate-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">No Analytics Yet</h2>
            <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Start practice to see your projected score and performance.
            </p>
            <Button
              onClick={() => {
                if (!isAdminReadOnly) router.push(studyPath);
              }}
              disabled={isAdminReadOnly}
              className={
                isAdminReadOnly
                  ? "h-11 cursor-not-allowed rounded-xl bg-slate-200 px-6 font-semibold text-slate-400 shadow-none dark:bg-white/[0.06] dark:text-slate-500"
                  : "bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 h-11 rounded-xl shadow-md"
              }
            >
              Start Practice
            </Button>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Projected score is a statistical estimate based on MCQ performance.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-white/[0.04]">
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px] text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <APScoreCircle
                      score={subjectId ? projectionState.displayScore : null}
                      color={subjectId && predicted ? predicted.color : "#9ca3af"}
                      size="sm"
                      emptyLabel="N/A"
                    />
                    <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <span>Predicted</span>
                      <span className="relative pr-5">
                        AP Score
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 leading-none">
                          <APScoreExplainDialog inline triggerClassName="ml-0.5" projectionState={projectionState} />
                        </span>
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={`border-slate-200 dark:border-slate-700 dark:bg-white/[0.04] ${
                  showAdminFeatures || isAdminReadOnly
                    ? "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.08]"
                    : ""
                }`}
                onClick={
                  showAdminFeatures || isAdminReadOnly
                    ? () => historyPath && router.push(historyPath)
                    : undefined
                }
              >
                <CardContent className="p-4 text-center">
                  <BarChart3 className="mx-auto mb-2 h-8 w-8 text-blue-500" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{testHistory.length}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tests Completed</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-white/[0.04]">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {testHistory.reduce((sum, t) => sum + t.score, 0)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Correct</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-white/[0.04]">
                <CardContent className="p-4 text-center">
                  <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {testHistory.reduce((sum, t) => sum + (t.totalQuestions - t.score), 0)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Incorrect</p>
                </CardContent>
              </Card>
            </div>

            {unitEntries.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-white/[0.04]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg dark:text-slate-100">
                    {subjectDisplayName ? `${subjectDisplayName}: Performance by Unit` : "Performance by Unit"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {unitEntries.map((unit) => {
                      const pct = unit.percentage;
                      const targets = { target2, target3, target4, target5 };
                      const tierResult = getUnitTierFromScore(pct, targets);
                      const fillClass = TIER_FILL_CLASS[tierResult.tier] ?? TIER_FILL_CLASS.none;
                      const textClass = tierResult.textClass;
                      return (
                        <div key={unit.code} className="flex items-center gap-3">
                          <div className="w-56 sm:w-64 flex-shrink-0">
                            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300" title={unit.name}>
                              {unit.unitNumber != null ? `U${unit.unitNumber}: ` : ""}{unit.name}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0 relative h-3">
                            {/* Zoned track: same 5-scale as dashboard/study (dark red → light red → light green → medium green → dark green) */}
                            <div className="absolute inset-0 flex rounded-full overflow-hidden pointer-events-none">
                              <div style={{ width: `${target2}%` }} className="bg-red-200 dark:bg-red-900/40" aria-hidden />
                              <div style={{ width: `${target3 - target2}%` }} className="bg-red-100 dark:bg-red-800/30" aria-hidden />
                              <div style={{ width: `${target4 - target3}%` }} className="bg-green-200 dark:bg-green-800/30" aria-hidden />
                              <div style={{ width: `${target5 - target4}%` }} className="bg-green-400/50 dark:bg-green-700/40" aria-hidden />
                              <div className="flex-1 bg-green-600/50 dark:bg-green-900/40" aria-hidden />
                            </div>
                            {pct < target2 && (
                              <div
                                className="absolute top-0 bottom-0 w-1 bg-red-400 pointer-events-none z-10 rounded-sm"
                                style={{ left: `${target2}%`, marginLeft: -2 }}
                                aria-hidden
                              />
                            )}
                            {pct < target3 && (
                              <div
                                className="absolute top-0 bottom-0 w-1 bg-green-300 pointer-events-none z-10 rounded-sm"
                                style={{ left: `${target3}%`, marginLeft: -2 }}
                                aria-hidden
                              />
                            )}
                            {pct < target4 && (
                              <div
                                className="absolute top-0 bottom-0 w-1 bg-green-600 pointer-events-none z-10 rounded-sm"
                                style={{ left: `${target4}%`, marginLeft: -2 }}
                                aria-hidden
                              />
                            )}
                            <div
                              className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10 flex items-center justify-center"
                              style={{ left: `${target5}%` }}
                              aria-hidden
                            >
                              <Crown size={14} strokeWidth={2} className="fill-[#FFD700] stroke-black dark:stroke-white" />
                            </div>
                            <Progress
                              value={unit.percentage}
                              className={`h-3 relative z-[5] bg-transparent ${fillClass}`}
                            />
                          </div>
                          <div className="w-12 flex-shrink-0 text-right">
                            <span className={`text-sm font-bold ${textClass}`}>
                              {unit.percentage}%
                            </span>
                          </div>
                          <div className="w-14 flex-shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                            {unit.correct}/{unit.total}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      <SimpleFooter />
    </div>
  );
}
