import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CalendarDays,
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
  Area,
  AreaChart,
} from "recharts";

interface UnitStats {
  correct: number;
  incorrect: number;
  total: number;
  avgTimeSec: number;
}

interface AnalyticsData {
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalTimeSpentSec: number;
  dueForReview: number;
  byUnit: { [unitId: string]: UnitStats };
}

interface ScoreHistoryEntry {
  date: string;
  accuracy: number;
  predictedScore: number;
  totalAttempted: number;
}

function predictAPScore(accuracy: number): { score: number; label: string; color: string } {
  if (accuracy >= 85) return { score: 5, label: "Extremely well qualified", color: "#10b981" };
  if (accuracy >= 70) return { score: 4, label: "Well qualified", color: "#22c55e" };
  if (accuracy >= 55) return { score: 3, label: "Qualified", color: "#eab308" };
  if (accuracy >= 40) return { score: 2, label: "Possibly qualified", color: "#f97316" };
  return { score: 1, label: "No recommendation", color: "#ef4444" };
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const scoreColors: Record<number, string> = {
  5: "#10b981",
  4: "#22c55e",
  3: "#eab308",
  2: "#f97316",
  1: "#ef4444",
};

export default function AnalyticsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = router.query.subject as string | undefined;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: analyticsResponse, isLoading } = useQuery<{
    success: boolean;
    data: AnalyticsData;
  }>({
    queryKey: ["analytics", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/analytics?subjectId=${subjectId}`
        : "/api/user/analytics";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: historyResponse } = useQuery<{
    success: boolean;
    data: ScoreHistoryEntry[];
  }>({
    queryKey: ["scoreHistory", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/score-history?subjectId=${subjectId}`
        : "/api/user/score-history";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch score history");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const stats = analyticsResponse?.data;
  const scoreHistory = historyResponse?.data || [];
  const accuracy = stats && stats.totalAttempted > 0
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0;
  const hasEnoughForPrediction = (stats?.totalAttempted || 0) >= 25;
  const predicted = predictAPScore(accuracy);

  const unitEntries = stats?.byUnit
    ? Object.entries(stats.byUnit).sort((a, b) => {
        const accA = a[1].total > 0 ? a[1].correct / a[1].total : 0;
        const accB = b[1].total > 0 ? b[1].correct / b[1].total : 0;
        return accA - accB;
      })
    : [];

  const filteredHistory = scoreHistory.filter(entry => (entry.totalAttempted || 0) >= 25);
  const chartData = (() => {
    if (filteredHistory.length === 0) return [];
    const result = [filteredHistory[0]];
    let nextThreshold = 35;
    for (let i = 1; i < filteredHistory.length; i++) {
      const attempted = filteredHistory[i].totalAttempted || 0;
      if (attempted >= nextThreshold) {
        result.push(filteredHistory[i]);
        nextThreshold = attempted - (attempted - 25) % 10 + 10;
      }
    }
    return result.map(entry => ({
      ...entry,
      dateLabel: formatDate(entry.date),
    }));
  })();

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

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-khan-green" />
            Analytics
          </h1>
          {subjectId && (
            <Badge className="bg-khan-green text-white">{subjectId}</Badge>
          )}
        </div>

        {!stats || stats.totalAttempted === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No data yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Start practicing questions to see your performance analytics
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-khan-green hover:bg-khan-green-light text-white"
            >
              Start Practicing
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <Target className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{accuracy}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCorrect}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Correct</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <XCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalIncorrect}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Incorrect</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.dueForReview}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Due for Review</p>
                </CardContent>
              </Card>
            </div>

            {hasEnoughForPrediction ? (
              <Card className="border-2 dark:bg-gray-900 overflow-hidden" style={{ borderColor: predicted.color }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <TrendingUp className="h-5 w-5" style={{ color: predicted.color }} />
                    Predicted AP Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div
                      className="flex items-center justify-center w-24 h-24 rounded-full text-white text-4xl font-bold shadow-lg"
                      style={{ backgroundColor: predicted.color }}
                    >
                      {predicted.score}
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{predicted.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Based on <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.totalAttempted}</span> questions with <span className="font-semibold" style={{ color: predicted.color }}>{accuracy}%</span> accuracy
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Progress value={accuracy} className="h-3 flex-1" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{accuracy}%</span>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                        <span>Score 1</span>
                        <span>Score 2</span>
                        <span>Score 3</span>
                        <span>Score 4</span>
                        <span>Score 5</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 dark:bg-gray-900 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                    Predicted AP Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-4xl font-bold">
                      ?
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Not enough data yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Answer at least <span className="font-semibold text-gray-700 dark:text-gray-300">25 questions</span> to get your predicted AP score.
                        You've answered <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.totalAttempted}</span> so far — <span className="font-semibold text-khan-green">{25 - stats.totalAttempted} more to go!</span>
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Progress value={(stats.totalAttempted / 25) * 100} className="h-3 flex-1" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{stats.totalAttempted}/25</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {chartData.length > 1 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Score Progress Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-2xl font-bold" style={{ color: scoreColors[chartData[chartData.length - 1]?.predictedScore] || "#6b7280" }}>
                        {chartData[chartData.length - 1]?.predictedScore || "-"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current Score</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-2xl font-bold text-blue-500">
                        {chartData[chartData.length - 1]?.accuracy || 0}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Latest Accuracy</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      {(() => {
                        const first = chartData[0]?.predictedScore || 0;
                        const last = chartData[chartData.length - 1]?.predictedScore || 0;
                        const diff = last - first;
                        return (
                          <>
                            <p className={`text-2xl font-bold ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-gray-500"}`}>
                              {diff > 0 ? `+${diff}` : diff === 0 ? "0" : `${diff}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Score Change</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis
                          yAxisId="score"
                          domain={[0, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          label={{ value: "AP Score", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9ca3af" }, offset: 20 }}
                        />
                        <YAxis
                          yAxisId="accuracy"
                          orientation="right"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          label={{ value: "Accuracy %", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "#9ca3af" }, offset: 20 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.95)",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "13px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "predictedScore") return [value, "AP Score"];
                            if (name === "accuracy") return [`${value}%`, "Accuracy"];
                            return [value, name];
                          }}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <ReferenceLine yAxisId="score" y={3} stroke="#eab308" strokeDasharray="5 5" strokeOpacity={0.5} />
                        <Area
                          yAxisId="accuracy"
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#3b82f6"
                          fill="url(#accuracyGradient)"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#3b82f6" }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="score"
                          type="stepAfter"
                          dataKey="predictedScore"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const color = scoreColors[payload.predictedScore] || "#6b7280";
                            return (
                              <circle
                                key={`dot-${props.index}`}
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill={color}
                                stroke="white"
                                strokeWidth={2}
                              />
                            );
                          }}
                          activeDot={{ r: 8 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      AP Score (1-5)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Accuracy %
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-0 border-t-2 border-dashed border-yellow-500" />
                      Score 3 (Qualified)
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {chartData.length <= 1 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 border-dashed">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score Progress Chart</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {!hasEnoughForPrediction
                      ? `Answer at least 25 questions to see your first score plot. You've answered ${stats.totalAttempted} so far.`
                      : "Keep practicing to see your AP score trend over time. New data points are added every 10 questions."}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Time Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Study Time</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatTime(stats.totalTimeSpentSec)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg per Question</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalAttempted > 0 ? formatTime(stats.totalTimeSpentSec / stats.totalAttempted) : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <div className="space-y-4">
                    {unitEntries.map(([unitId, unitStats]) => {
                      const unitAcc = unitStats.total > 0
                        ? Math.round((unitStats.correct / unitStats.total) * 100)
                        : 0;
                      const isWeak = unitAcc < 50;
                      return (
                        <div key={unitId} className="flex items-center gap-4">
                          <div className="w-24 flex-shrink-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{unitId}</p>
                          </div>
                          <div className="flex-1">
                            <Progress
                              value={unitAcc}
                              className={`h-3 ${isWeak ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`}
                            />
                          </div>
                          <div className="w-16 text-right">
                            <span className={`text-sm font-bold ${isWeak ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                              {unitAcc}%
                            </span>
                          </div>
                          <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">
                            {unitStats.correct}/{unitStats.total}
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
