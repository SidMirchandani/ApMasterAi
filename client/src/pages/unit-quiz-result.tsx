import { useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, RotateCcw } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface TestHistoryEntry {
  id: string;
  type?: string;
  score: number;
  percentage: number;
  totalQuestions: number;
  subjectId: string;
  unitId?: string;
  sectionCode?: string;
  sectionBreakdown?: {
    [key: string]: { name: string; unitNumber: number };
  };
}

export default function UnitQuizResultPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = (router.query.subject as string) || "";
  const testId = (router.query.testId as string) || "";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: response } = useQuery<{ success: boolean; data: TestHistoryEntry[] }>({
    queryKey: ["testHistory", subjectId, testId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/test-history?subjectId=${subjectId}`);
      if (!res.ok) throw new Error("Failed to fetch test history");
      return res.json();
    },
    enabled: isAuthenticated && !!subjectId && !!testId && router.isReady,
  });

  const tests = response?.data ?? [];
  const test = tests.find((t) => t.id === testId && t.type === "unit");

  const handlePracticeAgain = () => {
    if (test?.unitId) {
      router.push(`/quiz?subject=${subjectId}&unit=${encodeURIComponent(test.unitId)}`);
    } else {
      router.push(`/study?subject=${subjectId}`);
    }
  };

  if (!router.isReady || loading) {
    return null;
  }

  if (!subjectId || !testId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Missing subject or test ID.</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
        <SimpleFooter />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-6 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-300">Unit quiz result not found.</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => router.push(`/full-length-history?subject=${subjectId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to test history
              </Button>
            </CardContent>
          </Card>
        </div>
        <SimpleFooter />
      </div>
    );
  }

  const sectionName =
    test.sectionCode && test.sectionBreakdown?.[test.sectionCode]
      ? test.sectionBreakdown[test.sectionCode].name
      : test.sectionCode ?? "Unit quiz";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1"
          onClick={() => router.push(`/full-length-history?subject=${subjectId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Test history
        </Button>
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
              <BookOpen className="h-5 w-5 text-green-500" />
              Unit quiz result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{sectionName}</p>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {test.score} / {test.totalQuestions}
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{test.percentage}%</p>
            </div>
            <Button className="w-full gap-2" onClick={handlePracticeAgain}>
              <RotateCcw className="h-4 w-4" />
              Practice again
            </Button>
          </CardContent>
        </Card>
      </div>
      <SimpleFooter />
    </div>
  );
}
