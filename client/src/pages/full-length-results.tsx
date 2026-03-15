import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import { UnifiedQuizResultsReview } from "@/components/quiz/UnifiedQuizResultsReview";
import { getApiCodeForSubject } from "@/subjects";

interface Question {
  id: string;
  prompt: string;
  prompt_blocks?: any[];
  choices: { [key: string]: any[] };
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
  questions?: Question[];
  userAnswers?: { [key: number]: string };
  sectionBreakdown?: {
    [sectionCode: string]: {
      name: string;
      unitNumber: number;
      correct: number;
      total: number;
      percentage: number;
    };
  };
  timestamp?: string | number | Date;
  type?: string;
}

export default function FullLengthResults() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, testId, returnTo } = router.query;
  const returnToParam = typeof returnTo === "string" ? returnTo : Array.isArray(returnTo) ? returnTo[0] : undefined;
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [score, setScore] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [unitQuestionsLoading, setUnitQuestionsLoading] = useState(false);
  const [unitQuestionsError, setUnitQuestionsError] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!subjectId || !testId || !isAuthenticated) return;

      setFetchError(null);
      try {
        const response = await apiRequest(
          "GET",
          `/api/user/subjects/${subjectId}/test-results/${testId}`,
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 404) {
            setFetchError(data.message || "Test result not found");
            setTestData(null);
          } else {
            setFetchError(data.message || "Failed to fetch test results");
          }
          setIsLoading(false);
          return;
        }

        setTestData(data.data);
        setQuestions(normalizeQuestions(data.data?.questions ?? []));
        setUserAnswers(data.data?.userAnswers || {});
        setScore(data.data?.score ?? 0);
        setTotalQuestions(data.data?.totalQuestions ?? 0);
      } catch (error) {
        console.error("Error fetching test results:", error);
        setFetchError("Failed to load test results");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestData();
  }, [subjectId, testId, isAuthenticated]);

  // For unit quiz results that came back without questions, fetch unit questions so we can show full review
  useEffect(() => {
    if (
      !testData ||
      testData.type !== "unit" ||
      questions.length > 0 ||
      !subjectId
    ) return;
    const sectionBreakdown = testData.sectionBreakdown ?? {};
    const sectionCodes = Object.keys(sectionBreakdown);
    if (sectionCodes.length === 0) return;

    const subjectApiCode = getApiCodeForSubject(subjectId as string);
    if (!subjectApiCode) return;

    const sectionCode = sectionCodes[0];
    const limit = Math.max(totalQuestions || 25, 25);

    let cancelled = false;
    setUnitQuestionsError(false);
    setUnitQuestionsLoading(true);

    (async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=${limit}`,
        );
        if (cancelled) return;
        if (!response.ok) {
          setUnitQuestionsError(true);
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (cancelled || !data?.data?.length) {
          if (!data?.data?.length) setUnitQuestionsError(true);
          return;
        }
        const normalized = normalizeQuestions(data.data);
        setQuestions(normalized.slice(0, totalQuestions || normalized.length));
      } catch {
        if (!cancelled) setUnitQuestionsError(true);
      } finally {
        if (!cancelled) setUnitQuestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [testData?.id, testData?.type, subjectId, totalQuestions, questions.length]);

  const handleCloseReview = () => {
    router.push(subjectId ? `/full-length-history?subject=${subjectId}` : "/full-length-history");
  };

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

  if (fetchError) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto">
            <p className="text-gray-600 dark:text-gray-400 font-medium">{fetchError}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              The result may have been removed or the link is invalid. Return to Quiz/Test History to see your saved results.
            </p>
            <Button onClick={handleCloseReview} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quiz/Test History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!testData) {
    return null;
  }

  const hasQuestions = questions.length > 0;
  const sectionBreakdown = testData.sectionBreakdown ?? {};
  const isUnitQuiz = testData.type === "unit";

  // Unit quizzes: show full review (same as full-length/diagnostic). If API didn't return questions, we fetch them.
  if (isUnitQuiz && !hasQuestions && Object.keys(sectionBreakdown).length > 0) {
    if (unitQuestionsLoading) {
      return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
          <Navigation />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
          </div>
        </div>
      );
    }
    if (unitQuestionsError) {
      return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">Question details could not be loaded for this unit quiz.</p>
              <Button onClick={handleCloseReview} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quiz/Test History
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Summary-only view: only for non-unit tests that have section breakdown but no question list
  if (!hasQuestions && Object.keys(sectionBreakdown).length > 0 && !isUnitQuiz) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {testData.type === "diagnostic" ? "Diagnostic" : "Test"} Results
              </h1>
              <Button variant="outline" onClick={handleCloseReview}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quiz/Test History
              </Button>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{score} / {totalQuestions}</p>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{testData.percentage ?? (totalQuestions ? Math.round((score / totalQuestions) * 100) : 0)}%</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Section breakdown</h2>
                <ul className="space-y-2">
                  {Object.entries(sectionBreakdown).map(([code, section]) => (
                    <li key={code} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{section.name}</span>
                      <span className="font-medium">{section.correct}/{section.total} ({section.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasQuestions) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">No question details available for this result.</p>
            <Button onClick={handleCloseReview} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quiz/Test History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />
      <UnifiedQuizResultsReview
        questions={questions as any}
        userAnswers={userAnswers}
        subjectId={subjectId as string}
        score={score}
        totalQuestions={totalQuestions}
        isFullLength={testData.type !== "unit"}
        onCloseReview={handleCloseReview}
        testId={testId as string}
        sectionReviewReturnTo={returnToParam}
      />
    </div>
  );
}
