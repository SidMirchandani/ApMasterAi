import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getApiCodeForSubject, getSectionByCode } from "@/subjects";
import { getPredictedAPScoreFromTests, getTargetPercentagesForSubject, getUnitTierFromScore, getAPScoreColor } from "@/lib/ap-score-utils";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";

interface TestHistoryEntry {
  testNumber: number;
  id: string;
  date: any;
  score: number;
  percentage: number;
  totalQuestions: number;
  subjectId: string;
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

function TestScoreTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const percentage = data.percentage;
  const score = data.score;
  const totalQuestions = data.totalQuestions;

  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-blue-600 text-sm leading-tight">
        {percentage}%
      </div>
      <div className="text-[11px] text-gray-600 leading-tight">
        {score}/{totalQuestions} correct
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = router.query.subject as string | undefined;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: testHistoryResponse, isLoading } = useQuery<{
    success: boolean;
    data: TestHistoryEntry[];
  }>({
    queryKey: ["testHistory", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/test-history?subjectId=${subjectId}`
        : "/api/user/test-history";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch test history");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const testHistory = testHistoryResponse?.data || [];
  
  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;
  const { target2, target3, target4, target5 } = getTargetPercentagesForSubject(subjectCode);

  // --- Fetch unitProgress (includes diagnostic per-unit scores) ---
  const { data: unitProgressResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["unitProgress", subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/subjects/${subjectId}/unit-progress`);
      if (!res.ok) throw new Error("Failed to fetch unit progress");
      return res.json();
    },
    enabled: isAuthenticated && !!user && !!subjectId,
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

  // Projected score: average of per-unit best percentages (only units with any data)
  const unitBestValues = Object.values(unitBestMap).filter((v) => v > 0);
  const hasEnoughForPrediction = unitBestValues.length > 0 || testHistory.length >= 1;
  const projectedPercentage =
    unitBestValues.length > 0
      ? Math.round(unitBestValues.reduce((s, v) => s + v, 0) / unitBestValues.length)
      : testHistory.length > 0
      ? Math.round(testHistory.reduce((sum, test) => sum + test.percentage, 0) / testHistory.length)
      : 0;
  const predicted = getPredictedAPScoreFromTests(projectedPercentage, subjectCode);

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
    .sort((a, b) => a.percentage - b.percentage);

  // Same 5-scale fill colors as dashboard/study for Performance by Unit bars
  const TIER_FILL_CLASS: Record<string, string> = {
    "1": "[&>div]:bg-red-700 [&>div]:dark:bg-red-800",
    "2": "[&>div]:bg-red-400 [&>div]:dark:bg-red-500",
    "3": "[&>div]:bg-green-300 [&>div]:dark:bg-green-400",
    "4": "[&>div]:bg-green-600 [&>div]:dark:bg-green-600",
    "5": "[&>div]:bg-green-700 [&>div]:dark:bg-green-800",
    none: "[&>div]:bg-slate-400 [&>div]:dark:bg-slate-500",
  };

  const testChartData = testHistory.map((test) => ({
    testLabel: `Test ${test.testNumber}`,
    testNumber: test.testNumber,
    percentage: test.percentage,
    score: test.score,
    totalQuestions: test.totalQuestions,
    date: test.date
  }));

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-khan-green" />
            Analytics
          </h1>
          {subjectId && (
            <Badge className="bg-blue-600 dark:bg-blue-500 text-white">{getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId ?? "")}</Badge>
          )}
        </div>

        {testHistory.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-800/50">
              <BarChart3 className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Unlock Your Projected AP Score</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Take our 25-question adaptive diagnostic to see your projected 1–5 score and identify your weakest units.
            </p>
            <Button
              onClick={() => router.push(subjectId ? `/diagnostic?subject=${subjectId}` : "/diagnostic")}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 h-11 rounded-xl shadow-md"
            >
              Take Quick Diagnostic Test
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Projected score is a statistical estimate based on MCQ performance.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="mx-auto mb-2">
                    <APScoreCircle
                      score={subjectId && hasEnoughForPrediction ? predicted.score : null}
                      color={subjectId && hasEnoughForPrediction ? predicted.color : "#9ca3af"}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex flex-wrap justify-center items-center gap-x-1 gap-y-0">
                    <span>Predicted</span>
                    <span className="relative pr-5">
                      AP Score
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 leading-none">
                        <APScoreExplainDialog inline triggerClassName="ml-0.5" />
                      </span>
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{testHistory.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tests Completed</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {testHistory.reduce((sum, t) => sum + t.score, 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Correct</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <XCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {testHistory.reduce((sum, t) => sum + (t.totalQuestions - t.score), 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Incorrect</p>
                </CardContent>
              </Card>
            </div>

            {testChartData.length >= 1 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Test Score Progress
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 px-1">
                    Track your performance across all full-length practice tests
                  </p>
                  <div className="mb-4 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {testChartData[testChartData.length - 1]?.percentage || "-"}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Latest Test</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      {(() => {
                        if (testChartData.length < 2) {
                          return (
                            <>
                              <p className="text-2xl font-bold text-gray-500">-</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Score Change</p>
                            </>
                          );
                        }
                        const first = testChartData[0]?.percentage || 0;
                        const last = testChartData[testChartData.length - 1]?.percentage || 0;
                        const diff = last - first;
                        return (
                          <>
                            <p className={`text-2xl font-bold ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-gray-500"}`}>
                              {diff > 0 ? `+${diff}%` : diff === 0 ? "0%" : `${diff}%`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Overall Change</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={testChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-10" />
                        <XAxis
                          dataKey="testLabel"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={false}
                          label={{ value: "Test #", position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "#9ca3af", fontWeight: "bold" } }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "Score %", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#9ca3af", fontWeight: "bold" }, offset: 15 }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          content={<TestScoreTooltip />}
                        />
                        <ReferenceLine
                          y={target4}
                          stroke={getAPScoreColor(4)}
                          strokeDasharray="5 5"
                          strokeWidth={3}
                          label={{ position: "top", value: `Score needed for 4: ~${Math.round(target4)}%`, fill: getAPScoreColor(4), fontSize: 14, fontWeight: 600, offset: 4 }}
                        />
                        <ReferenceLine
                          y={target5}
                          stroke={getAPScoreColor(5)}
                          strokeDasharray="5 5"
                          strokeWidth={3}
                          label={{ position: "top", value: `Score needed for 5: ~${Math.round(target5)}%`, fill: getAPScoreColor(5), fontSize: 14, fontWeight: 600, offset: 4 }}
                        />

                        <Line
                          type="natural"
                          dataKey="percentage"
                          stroke="#3b82f6"
                          strokeWidth={3.5}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const percentage = payload.percentage;
                            let color = "#3b82f6";
                            if (percentage >= 80) color = "#10b981";
                            else if (percentage >= 70) color = "#22c55e";
                            else if (percentage >= 50) color = "#eab308";
                            else color = "#ef4444";
                            
                            return (
                              <circle
                                key={`dot-${props.index}`}
                                cx={cx}
                                cy={cy}
                                r={7}
                                fill={color}
                                stroke="white"
                                strokeWidth={3}
                                style={{ cursor: "pointer" }}
                              />
                            );
                          }}
                          activeDot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const percentage = payload.percentage;
                            let color = "#3b82f6";
                            if (percentage >= 80) color = "#10b981";
                            else if (percentage >= 70) color = "#22c55e";
                            else if (percentage >= 50) color = "#eab308";
                            else color = "#ef4444";
                            
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={10}
                                fill={color}
                                stroke="white"
                                strokeWidth={3}
                                style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}
                              />
                            );
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0 border-t-[3px] border-blue-500" />
                      Test Score
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-0 border-t-[3px] border-dashed" style={{ borderColor: getAPScoreColor(4) }} />
                      Score needed for 4: ~{Math.round(target4)}%
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-0 border-t-[3px] border-dashed" style={{ borderColor: getAPScoreColor(5) }} />
                      Score needed for 5: ~{Math.round(target5)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {testChartData.length === 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 border-dashed">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Score Progress</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Complete a full-length practice test to see your score progression. Head to your dashboard to start a test!
                  </p>
                </CardContent>
              </Card>
            )}

            {unitEntries.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Performance by Unit
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                      (sorted weakest first)
                    </span>
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
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={unit.name}>
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
                            {pct < target5 && (
                              <div
                                className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10 flex items-center justify-center fill-[#FFD700] stroke-[#FFD700]"
                                style={{ left: `${target5}%` }}
                                aria-hidden
                              >
                                <Crown size={14} strokeWidth={2} />
                              </div>
                            )}
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
                          <div className="w-14 flex-shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
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
