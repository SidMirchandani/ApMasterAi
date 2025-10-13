import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, BookOpen } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/utils";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
}

interface TestData {
  id: string;
  date: string | number | Date | { seconds: number };
  score: number;
  percentage: number;
  totalQuestions: number;
  questions: Question[];
  userAnswers: { [key: number]: string };
  sectionBreakdown: {
    [sectionCode: string]: {
      name: string;
      unitNumber: number;
      correct: number;
      total: number;
      percentage: number;
    };
  };
}

export default function FullLengthResults() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, testId } = router.query;
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!subjectId || !testId || !isAuthenticated) return;

      try {
        const response = await apiRequest(
          "GET",
          `/api/user/subjects/${subjectId}/test-results/${testId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch test results");

        const data = await response.json();
        setTestData(data.data);
      } catch (error) {
        console.error("Error fetching test results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestData();
  }, [subjectId, testId, isAuthenticated]);

  const handleReviewSection = (sectionCode: string) => {
    router.push(
      `/section-review?subject=${subjectId}&testId=${testId}&section=all`,
    );
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

  if (!testData) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-khan-gray-medium">Test results not found</p>
            <Button
              onClick={() =>
                router.push(`/full-length-history?subject=${subjectId}`)
              }
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Test History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getPerformanceLevel = (pct: number) => {
    if (pct >= 90)
      return {
        label: "Excellent",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    if (pct >= 75)
      return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (pct >= 60)
      return {
        label: "Fair",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    return {
      label: "Needs Work",
      color: "text-red-600",
      bgColor: "bg-red-100",
    };
  };

  const overallPerformance = getPerformanceLevel(testData.percentage);

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 md:px-8 py-3 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() =>
              router.push(`/full-length-history?subject=${subjectId}`)
            }
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Test History
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-khan-gray-dark absolute left-1/2 transform -translate-x-1/2">
            Results Summary
          </h1>
          <div className="w-24"></div>
        </div>

        {/* Overall Score Card - Compact */}
        <Card className="border-t-4 border-t-khan-green">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {formatDateTime(testData.date)}
                </p>
                <p className="text-sm text-gray-500">
                  Page 1/1 (Q {testData.questions.length > 0 ? 1 : 0}-{testData.questions.length})
                </p>
              </div>

              <div className="flex items-center justify-center">
                <Button
                  onClick={() =>
                    router.push(
                      `/section-review?subject=${subjectId}&testId=${testId}&section=all`,
                    )
                  }
                  variant="outline"
                  size="sm"
                  className="border-khan-blue text-khan-blue hover:bg-khan-blue hover:text-white"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Review Whole Test
                </Button>
              </div>

              {/* Stats Grid - Compact */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {testData.score}
                      </p>
                      <p className="text-xs text-gray-600">Correct</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {testData.totalQuestions - testData.score}
                      </p>
                      <p className="text-xs text-gray-600">Incorrect</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-khan-blue flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {testData.totalQuestions}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">Total</p>
                      <p className="text-xs text-gray-600">Questions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit Performance Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="text-khan-blue h-5 w-5" />
              Test History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(testData.sectionBreakdown)
                .sort(
                  ([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0),
                )
                .map(([sectionCode, section]) => {
                  const sectionPerf = getPerformanceLevel(section.percentage);
                  return (
                    <div
                      key={sectionCode}
                      className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-khan-green"
                      onClick={() => handleReviewSection(sectionCode)}
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-khan-green bg-khan-green/10 px-2 py-0.5 rounded">
                              Unit {section.unitNumber || 0}
                            </span>
                            <h3 className="font-semibold text-sm text-gray-900">
                              {section.name}
                            </h3>
                            <span className="text-xs text-gray-600">
                              ({section.correct}/{section.total})
                            </span>
                          </div>
                        </div>
                        <div
                          className={`px-3 py-0.5 rounded-full ${sectionPerf.bgColor} ${sectionPerf.color} text-xs font-medium flex-shrink-0`}
                        >
                          {section.percentage}%
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            section.percentage >= 75
                              ? "bg-green-500"
                              : section.percentage >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${section.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}