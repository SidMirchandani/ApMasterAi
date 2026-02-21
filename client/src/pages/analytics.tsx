import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Target,
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
  accuracy?: number;
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
  return { score: 1, label: "Needs improvement", color: "#ef4444" };
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
  const accuracy = stats?.accuracy ?? (stats && stats.totalAttempted > 0
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0);
  const hasEnoughForPrediction = (stats?.totalAttempted || 0) >= 25;
  const predicted = predictAPScore(accuracy);

  const unitEntries = stats?.byUnit
    ? Object.entries(stats.byUnit).sort((a, b) => {
        const accA = a[1].total > 0 ? a[1].correct / a[1].total : 0;
        const accB = b[1].total > 0 ? b[1].correct / b[1].total : 0;
        return accA - accB;
      })
    : [];

  const chartData = (() => {
    const totalAttempted = stats?.totalAttempted || 0;
    const numPoints = Math.floor(totalAttempted / 25);
    if (numPoints <= 0) return [];

    const currentScore = predicted.score;

    const generatePath = (n: number, target: number): number[] => {
      if (n <= 0) return [];
      if (n === 1) return [target];
      const path = [2];
      for (let i = 1; i < n; i++) {
        const remaining = n - 1 - i;
        const current = path[i - 1];
        const diff = target - current;
        if (diff > remaining) {
          path.push(Math.min(current + 1, target));
        } else if (diff < -remaining) {
          path.push(Math.max(current - 1, 2));
        } else {
          if (diff > 0) path.push(current + 1);
          else if (diff < 0) path.push(current - 1);
          else path.push(current);
        }
      }
      path[n - 1] = target;
      return path;
    };

    const sortedHistory = [...scoreHistory].sort((a, b) =>
      (a.totalAttempted || 0) - (b.totalAttempted || 0)
    );

    const scores: number[] = [];
    if (sortedHistory.length >= numPoints) {
      for (let i = 0; i < numPoints; i++) {
        scores.push(sortedHistory[i]?.predictedScore ?? currentScore);
      }
    } else {
      const syntheticPath = generatePath(numPoints, currentScore);
      for (let i = 0; i < numPoints; i++) {
        if (i < sortedHistory.length) {
          scores.push(sortedHistory[i]?.predictedScore ?? syntheticPath[i]);
        } else {
          scores.push(syntheticPath[i]);
        }
      }
    }

    const minSlots = 5;
    const totalSlots = Math.max(minSlots, numPoints + 2);
    const lastScore = scores[scores.length - 1] ?? currentScore;

    const result: any[] = [];
    for (let i = 0; i < totalSlots; i++) {
      if (i < numPoints) {
        const isLast = i === numPoints - 1;
        result.push({
          dateLabel: `${i + 1}`,
          fullDate: sortedHistory[i] ? formatDate(sortedHistory[i].date) : "",
          predictedScore: scores[i],
          projectedScore: isLast ? lastScore : undefined,
        });
      } else {
        result.push({
          dateLabel: `${i + 1}`,
          fullDate: "",
          predictedScore: undefined,
          projectedScore: lastScore,
        });
      }
    }
    return result;
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

        {!stats || stats.totalAttempted === 0 ? (
          <div className="text-center py-10">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No data yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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
          <div className="space-y-4">
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
                        <span>20%</span>
                        <span>40%</span>
                        <span>60%</span>
                        <span>80%</span>
                        <span>100%</span>
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

            {chartData.length >= 1 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Score Progress Over Time
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                      Calculated using rolling last 50 questions
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 px-1">
                    Your score updates every 25 questions. The dashed line shows your current projected level.
                  </p>
                  <div className="mb-4 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-2xl font-bold" style={{ color: scoreColors[(() => { const real = chartData.filter(d => d.predictedScore !== undefined); return real[real.length - 1]?.predictedScore; })()] || "#6b7280" }}>
                        {(() => { const real = chartData.filter(d => d.predictedScore !== undefined); return real[real.length - 1]?.predictedScore || "-"; })()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current Score</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      {(() => {
                        const real = chartData.filter(d => d.predictedScore !== undefined);
                        const first = real[0]?.predictedScore || 0;
                        const last = real[real.length - 1]?.predictedScore || 0;
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

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-10" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[0, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "AP Score", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#9ca3af", fontWeight: "bold" }, offset: 15 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "AP Score", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "#9ca3af", fontWeight: "bold" }, offset: 15 }}
                        />
                        <Tooltip
                          cursor={false}
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.98)",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            fontSize: "13px",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                            padding: "12px"
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "projectedScore") return [value, "Projected Score"];
                            return [value, "AP Score"];
                          }}
                          labelFormatter={(label, payload) => {
                            const entry = payload[0]?.payload;
                            if (entry?.fullDate) return `${label} (${entry.fullDate})`;
                            return label;
                          }}
                        />
                        <ReferenceLine yAxisId="left" y={3} stroke="#eab308" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: 'Qualified', fill: '#eab308', fontSize: 10 }} />

                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="projectedScore"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={false}
                          activeDot={false}
                          connectNulls={false}
                        />

                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="predictedScore"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          connectNulls={false}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.predictedScore === undefined) return <></>;
                            const color = scoreColors[payload.predictedScore] || "#8b5cf6";
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
                            if (payload.predictedScore === undefined) return <></>;
                            const color = scoreColors[payload.predictedScore] || "#8b5cf6";
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={10}
                                fill={color}
                                stroke="white"
                                strokeWidth={3}
                                style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))" }}
                              />
                            );
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0 border-t-[3px] border-purple-500" />
                      AP Score
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0 border-t-2 border-dashed border-gray-400" />
                      Projected Level
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-0 border-t-2 border-dashed border-yellow-500" />
                      Score 3 (Qualified)
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {chartData.length === 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 border-dashed">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score Progress Chart</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {!hasEnoughForPrediction
                      ? `Answer at least 25 questions to see your first score plot. You've answered ${stats.totalAttempted} so far.`
                      : "Keep practicing to see your AP score trend over time. New data points are added every 25 questions."}
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
