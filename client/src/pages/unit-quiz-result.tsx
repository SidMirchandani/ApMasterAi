import { useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
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
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">Missing subject or test ID.</p>
          <Button
            variant="ghost"
            className="mt-6 h-11 rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 hover:text-white"
            onClick={() => router.push("/dashboard")}
          >
            Back to dashboard
          </Button>
        </main>
        <SimpleFooter />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <main className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-3xl bg-slate-100 px-6 py-10 text-center dark:bg-white/[0.06]">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="text-slate-700 dark:text-slate-300">Unit quiz result not found.</p>
            <Button
              variant="ghost"
              className="mt-6 h-11 rounded-full px-6 font-semibold text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/[0.08]"
              onClick={() => router.push(`/full-length-history?subject=${subjectId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Test history
            </Button>
          </div>
        </main>
        <SimpleFooter />
      </div>
    );
  }

  const sectionName =
    test.sectionCode && test.sectionBreakdown?.[test.sectionCode]
      ? test.sectionBreakdown[test.sectionCode].name
      : test.sectionCode ?? "Unit quiz";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />
      <main className="mx-auto max-w-md px-4 py-8 md:py-10">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 h-10 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          onClick={() => router.push(`/full-length-history?subject=${subjectId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Test history
        </Button>

        <div className="rounded-3xl bg-slate-100 px-6 py-8 dark:bg-white/[0.06]">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">Unit quiz result</h1>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{sectionName}</p>
          <div className="mt-4 rounded-2xl bg-white/90 py-6 text-center dark:bg-white/[0.08]">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {test.score} / {test.totalQuestions}
            </p>
            <p className="mt-1 text-lg text-slate-600 dark:text-slate-400">{test.percentage}%</p>
          </div>
          <Button
            variant="ghost"
            className="mt-6 h-11 w-full rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
            onClick={handlePracticeAgain}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Practice again
          </Button>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}
