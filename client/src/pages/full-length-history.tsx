import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Calendar, Target, PlayCircle } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface TestHistory {
  id: string;
  date: string | number | Date | { seconds: number };
  score: number;
  percentage: number;
  totalQuestions: number;
}

export default function FullLengthHistory() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId } = router.query;
  const isMobile = useIsMobile();
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
        const response = await apiRequest(
          "GET",
          `/api/user/subjects/${subjectId}/unit-progress`,
        );
        if (!response.ok) throw new Error("Failed to fetch test history");

        const data = await response.json();
        const fullLengthData = data.data?.["full-length"];

        if (fullLengthData?.history && Array.isArray(fullLengthData.history)) {
          setTestHistory(fullLengthData.history);
        }
      } catch (error) {
        console.error("Error fetching test history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [subjectId, isAuthenticated]);

  const handleStartNewTest = () => {
    router.push(`/quiz?subject=${subjectId}&unit=full-length`);
  };

  const handleViewResults = (testId: string) => {
    router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 75) return "text-blue-600 bg-blue-50 border-blue-200";
    if (percentage >= 60)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="mb-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <Button
                onClick={() => router.push(`/study?subject=${subjectId}`)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className={isMobile ? "" : "h-4 w-4 mr-2"} />
                {!isMobile && "Study"}
              </Button>
              <h1 className="text-base md:text-xl font-bold text-khan-gray-dark absolute left-1/2 transform -translate-x-1/2">
                Test History
              </h1>
              <Button
                onClick={handleStartNewTest}
                className="bg-khan-green hover:bg-khan-green/90"
                size="sm"
              >
                <PlayCircle className={isMobile ? "" : "mr-2 h-4 w-4"} />
                {!isMobile && "Start New Test"}
              </Button>
            </div>
          </div>

          {testHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Trophy className="h-12 w-12 text-khan-gray-light mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">
                  No Tests Taken Yet
                </h2>
                <p className="text-sm text-khan-gray-medium">
                  Start your first full-length practice test to track your
                  progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {testHistory.map((test, index) => (
                <Card key={test.id} className="relative group">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-khan-blue/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-bold text-khan-blue">
                              #{testHistory.length - index}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Calendar className="h-4 w-4 text-khan-gray-medium" />
                              <span className="text-sm text-khan-gray-medium">
                                {formatDateTime(test.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-khan-gray-medium" />
                              <span className="text-sm text-khan-gray-medium">
                                {test.score}/{test.totalQuestions} correct
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div
                          className={`px-4 py-2 rounded-lg border-2 ${getPerformanceColor(test.percentage)} flex-1 sm:flex-initial text-center`}
                        >
                          <span className="text-xl font-bold">
                            {test.percentage}%
                          </span>
                        </div>
                        <Button
                          onClick={() => handleViewResults(test.id)}
                          className="bg-khan-blue hover:bg-khan-blue/90 flex-1 sm:flex-initial"
                        >
                          View Results
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
