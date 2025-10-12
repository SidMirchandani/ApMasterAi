
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
        const response = await apiRequest("GET", `/api/user/subjects/${subjectId}/test-results/${testId}`);
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
    router.push(`/section-review?subject=${subjectId}&testId=${testId}&section=${sectionCode}`);
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
            <Button onClick={() => router.push(`/full-length-history?subject=${subjectId}`)} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getPerformanceLevel = (pct: number) => {
    if (pct >= 90) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-100" };
    if (pct >= 75) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (pct >= 60) return { label: "Fair", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { label: "Needs Work", color: "text-red-600", bgColor: "bg-red-100" };
  };

  const overallPerformance = getPerformanceLevel(testData.percentage);

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => router.push(`/full-length-history?subject=${subjectId}`)}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
            <h1 className="text-3xl font-bold text-khan-gray-dark">Test Results</h1>
          </div>

          {/* Overall Score Card */}
          <Card className="border-t-4 border-t-khan-green">
            <CardContent className="pt-8 pb-6">
              <div className="text-center">
                <p className="text-sm text-khan-gray-medium mb-3">{formatDateTime(testData.date)}</p>
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-khan-green to-green-600 mb-3">
                  <span className="text-4xl font-bold text-white">{testData.percentage}%</span>
                </div>
                <div className={`inline-block px-6 py-2 rounded-full ${overallPerformance.bgColor} ${overallPerformance.color} font-semibold text-lg mb-2`}>
                  {overallPerformance.label}
                </div>
                <p className="text-lg text-gray-600">
                  {testData.score} out of {testData.totalQuestions} questions correct
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Unit Performance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BookOpen className="text-khan-blue h-6 w-6" />
                Unit Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(testData.sectionBreakdown)
                  .sort(([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0))
                  .map(([sectionCode, section]) => {
                    const sectionPerf = getPerformanceLevel(section.percentage);
                    return (
                      <Card 
                        key={sectionCode} 
                        className="border rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-khan-green"
                        onClick={() => handleReviewSection(sectionCode)}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-khan-green bg-khan-green/10 px-2 py-1 rounded">
                                  Unit {section.unitNumber || 0}
                                </span>
                                <h3 className="font-semibold text-lg text-gray-900">{section.name}</h3>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {section.correct} / {section.total} correct
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full ${sectionPerf.bgColor} ${sectionPerf.color} text-sm font-medium`}>
                              {section.percentage}%
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                section.percentage >= 75 ? 'bg-green-500' :
                                section.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${section.percentage}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
