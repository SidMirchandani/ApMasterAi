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
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
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
import { getApiCodeForSubject } from "@/subjects";
import { getPredictedAPScoreFromTests } from "@/lib/ap-score-utils";

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
  
  // Calculate average test percentage for predicted AP score
  const avgTestPercentage = testHistory.length > 0
    ? Math.round(testHistory.reduce((sum, test) => sum + test.percentage, 0) / testHistory.length)
    : 0;
  
  const hasEnoughForPrediction = testHistory.length >= 1;
  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;
  const predicted = getPredictedAPScoreFromTests(avgTestPercentage, subjectCode);

  // Calculate unit performance from test data
  const unitPerformanceMap: { [unitName: string]: { correct: number; total: number } } = {};
  
  testHistory.forEach(test => {
    if (test.sectionBreakdown) {
      Object.entries(test.sectionBreakdown).forEach(([code, section]) => {
        const unitName = section.name;
        if (!unitPerformanceMap[unitName]) {
          unitPerformanceMap[unitName] = { correct: 0, total: 0 };
        }
        unitPerformanceMap[unitName].correct += section.correct;
        unitPerformanceMap[unitName].total += section.total;
      });
    }
  });

  const unitEntries = Object.entries(unitPerformanceMap)
    .map(([unitName, stats]) => ({
      name: unitName,
      correct: stats.correct,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    }))
    .sort((a, b) => a.percentage - b.percentage);

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
            <Badge className="bg-khan-green text-white">{subjectId}</Badge>
          )}
        </div>

        {testHistory.length === 0 ? (
          <div className="text-center py-10">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No test data yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Complete a full-length practice test to see your performance analytics
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-khan-green hover:bg-khan-green-light text-white"
            >
              Start a Test
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <div
                    className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md mb-2"
                    style={{ backgroundColor: subjectId && hasEnoughForPrediction ? predicted.color : "#9ca3af" }}
                  >
                    {subjectId && hasEnoughForPrediction ? predicted.score : "?"}
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Predicted AP Score
                  </p>
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
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{testHistory.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tests Completed</p>
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
                        <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: 'Target: 70%', fill: '#22c55e', fontSize: 10 }} />

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
                      <div className="w-6 h-0 border-t-2 border-dashed border-green-500" />
                      70% Target
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
                      const isWeak = unit.percentage < 50;
                      return (
                        <div key={unit.name} className="flex items-center gap-4">
                          <div className="w-40 flex-shrink-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{unit.name}</p>
                          </div>
                          <div className="flex-1">
                            <Progress
                              value={unit.percentage}
                              className={`h-3 ${isWeak ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`}
                            />
                          </div>
                          <div className="w-16 text-right">
                            <span className={`text-sm font-bold ${isWeak ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                              {unit.percentage}%
                            </span>
                          </div>
                          <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
