import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Target, Sparkles, Play } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/date";

interface TestHistory {
  id: string;
  date: string | number | Date | { seconds: number };
  score: number;
  percentage: number;
  totalQuestions: number;
  type?: "full-length" | "diagnostic";
  testNumber?: number;
}

export default function FullLengthHistory() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId } = router.query;
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!subjectId || !isAuthenticated) return;
      try {
        // Unified endpoint returns both full-length and diagnostic tests
        const response = await apiRequest("GET", `/api/user/test-history?subjectId=${subjectId}`);
        if (!response.ok) throw new Error("Failed to fetch test history");
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTestHistory(data.data);
        }
      } catch (error) {
        console.error("Error fetching test history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [subjectId, isAuthenticated]);

  const handleViewResults = (test: TestHistory) => {
    if (test.type === "diagnostic") {
      router.push(`/analytics?subject=${subjectId}`);
    } else {
      router.push(`/full-length-results?subject=${subjectId}&testId=${test.id}`);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
        </div>
      </div>
    );
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 75) return "text-blue-600 bg-blue-50 border-blue-200";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const reversed = [...testHistory].reverse();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <Navigation />
      <main className="py-6 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Test History
            </h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/diagnostic?subject=${subjectId}`)}
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10 rounded-xl text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                New Diagnostic
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/quiz?subject=${subjectId}&unit=full-length`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                <Play className="h-3.5 w-3.5 mr-1.5 fill-white" />
                New Full-Length
              </Button>
            </div>
          </div>

          {testHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">No Tests Taken Yet</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Take a diagnostic or full-length test to track your progress.
                </p>
                <Button
                  onClick={() => router.push(`/diagnostic?subject=${subjectId}`)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Take Quick Diagnostic Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {reversed.map((test) => {
                const originalIdx = testHistory.indexOf(test);
                return (
                  <Card key={test.id} className="relative group hover:shadow-md transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            test.type === "diagnostic"
                              ? "bg-red-100 dark:bg-red-500/20"
                              : "bg-blue-100 dark:bg-blue-500/20"
                          }`}>
                            {test.type === "diagnostic" ? (
                              <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                #{originalIdx + 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-semibold border-0 ${
                                test.type === "diagnostic"
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                              }`}>
                                {test.type === "diagnostic" ? "Diagnostic" : "Full-Length"}
                              </Badge>
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(test.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {test.score}/{test.totalQuestions} correct
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className={`px-3 py-1.5 rounded-lg border-2 ${getPerformanceColor(test.percentage)} flex-1 sm:flex-initial text-center`}>
                            <span className="text-lg font-bold">{test.percentage}%</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleViewResults(test)}
                            className={`flex-1 sm:flex-initial rounded-xl font-semibold text-xs ${
                              test.type === "diagnostic"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            View Results
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
