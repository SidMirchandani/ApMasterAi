import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, BookOpen, TrendingUp } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/date";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import { BlockRenderer } from "@/components/quiz/BlockRenderer";
import { Progress } from "@/components/ui/progress";


interface Question {
  id: string;
  prompt: string;
  prompt_blocks?: any[]; // Assuming prompt_blocks is an array of block objects
  choices: { [key: string]: any[] }; // Assuming choices are objects where values are arrays of block objects
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
  timestamp: string | number | Date; // Assuming timestamp exists for formatting
}

export default function FullLengthResults() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, testId } = router.query;
  const isMobile = useIsMobile();
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
        // Assuming the actual test data is nested under a 'data' key in the response
        setTestData(data.data);
      } catch (error) {
        console.error("Error fetching test results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestData();
  }, [subjectId, testId, isAuthenticated]);

  const handleReviewUnit = (sectionCode: string) => {
    console.log("📤 Navigating to section review with code:", sectionCode);
    router.push({
      pathname: "/section-review",
      query: {
        subject: subjectId,
        testId: testId,
        section: sectionCode,
      },
    });
  };

  const handleStartNewTest = () => {
    router.push(`/take-test?subject=${subjectId}`);
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

  const sectionBreakdown = testData.sectionBreakdown; // Alias for easier use

  return (
    <div className="min-h-screen bg-gradient-to-b from-khan-background via-white to-white relative overflow-hidden">
      {/* Background decoration - matching hero style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-khan-green/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-khan-blue/5 rounded-full blur-3xl"></div>
      </div>

      <Navigation />
      <main className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-khan-gray-dark text-center">
              Results Summary
            </h1>
          </div>

          {/* Overall Score Card - Compact */}
          <Card className="border-t-4 border-t-khan-green">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-500">
                    {formatDate(testData.date)}
                  </p>
                  <Button
                    onClick={() =>
                      router.push(
                        `/section-review?subject=${subjectId}&testId=${testId}&section=all`,
                      )
                    }
                    className="bg-khan-blue hover:bg-khan-blue/90 text-white w-full max-w-md"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Review Whole Test
                  </Button>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className={`flex ${isMobile ? 'flex-col' : ''} items-center justify-center gap-2`}>
                      <CheckCircle className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-green-500`} />
                      <div>
                        <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
                          {testData.score}
                        </p>
                        <p className="text-xs text-gray-600">Correct</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className={`flex ${isMobile ? 'flex-col' : ''} items-center justify-center gap-2`}>
                      <XCircle className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-red-500`} />
                      <div>
                        <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
                          {testData.totalQuestions - testData.score}
                        </p>
                        <p className="text-xs text-gray-600">Incorrect</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className={`flex ${isMobile ? 'flex-col' : ''} items-center justify-center gap-2`}>
                      <div className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} rounded-full bg-khan-blue flex items-center justify-center`}>
                        <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {testData.totalQuestions}
                        </span>
                      </div>
                      <div>
                        <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>Total</p>
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
            <CardContent className="pt-6">
              <div className="space-y-2">
                {Object.entries(sectionBreakdown)
                  .sort(
                    ([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0),
                  )
                  .map(([sectionCode, section]) => {
                    const sectionPerf = getPerformanceLevel(section.percentage);
                    return (
                      <div
                        key={sectionCode}
                        className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-khan-green"
                        onClick={() => handleReviewUnit(sectionCode)}
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
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              ({section.correct}/{section.total})
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
      </main>
    </div>
  );
}