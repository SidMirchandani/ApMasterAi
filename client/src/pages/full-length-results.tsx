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
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <main className="mx-auto max-w-lg px-4 py-12">
          <div className="rounded-3xl bg-slate-100 px-6 py-10 text-center dark:bg-white/[0.06]">
            <p className="font-medium text-slate-900 dark:text-white">{fetchError}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              The result may have been removed or the link is invalid. Open quiz & test history to see saved results.
            </p>
            <Button
              variant="ghost"
              onClick={handleCloseReview}
              className="mt-6 h-11 rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quiz & test history
            </Button>
          </div>
        </main>
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
        <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
          <Navigation />
          <div className="flex h-96 items-center justify-center">
            <div className="relative h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
            </div>
          </div>
        </div>
      );
    }
    if (unitQuestionsError) {
      return (
        <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
          <Navigation />
          <main className="mx-auto max-w-lg px-4 py-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">Question details could not be loaded for this unit quiz.</p>
            <Button
              variant="ghost"
              onClick={handleCloseReview}
              className="mt-6 h-11 rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quiz & test history
            </Button>
          </main>
        </div>
      );
    }
  }

  // Summary-only view: only for non-unit tests that have section breakdown but no question list
  if (!hasQuestions && Object.keys(sectionBreakdown).length > 0 && !isUnitQuiz) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <main className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {testData.type === "diagnostic" ? "Diagnostic" : "Test"} results
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseReview}
              className="h-10 rounded-full px-4 text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              History
            </Button>
          </div>
          <div className="space-y-6 rounded-3xl bg-slate-100 px-6 py-8 dark:bg-white/[0.06]">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {score} / {totalQuestions}
              </p>
              <p className="mt-1 text-lg text-slate-600 dark:text-slate-400">
                {testData.percentage ?? (totalQuestions ? Math.round((score / totalQuestions) * 100) : 0)}%
              </p>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Section breakdown</h2>
              <ul className="space-y-2">
                {Object.entries(sectionBreakdown).map(([code, section]) => (
                  <li key={code} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-white/[0.06]">
                    <span className="text-slate-700 dark:text-slate-300">{section.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {section.correct}/{section.total} ({section.percentage}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!hasQuestions) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">No question details available for this result.</p>
          <Button
            variant="ghost"
            onClick={handleCloseReview}
            className="mt-6 h-11 rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quiz & test history
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
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
        hasAppNav
      />
    </div>
  );
}
