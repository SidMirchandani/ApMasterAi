import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, X, FileQuestion, ClipboardList, BookOpen } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate, safeDateParse } from "@/lib/date";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { getApiCodeForSubject } from "@/subjects";

interface TestHistoryEntry {
  testNumber: number;
  id: string;
  date: any;
  score: number;
  percentage: number;
  totalQuestions: number;
  subjectId: string;
  type?: "full-length" | "diagnostic" | "unit";
  unitId?: string;
  sectionCode?: string;
  unitNumber?: number;
  sectionBreakdown?: {
    [key: string]: {
      name: string;
      unitNumber: number;
      correct: number;
      total: number;
      percentage: number;
    };
  };
}

function getTestTypeLabel(type: string): string {
  switch (type) {
    case "full-length":
      return "Full-Length MCQ Quiz";
    case "diagnostic":
      return "Diagnostic Quiz";
    case "unit":
      return "Unit Quiz";
    default:
      return type || "Test";
  }
}

function getTestTypeIcon(type: string) {
  switch (type) {
    case "full-length":
      return <FileQuestion className="h-4 w-4 text-blue-500" />;
    case "diagnostic":
      return <ClipboardList className="h-4 w-4 text-rose-500" />;
    case "unit":
      return <BookOpen className="h-4 w-4 text-green-500" />;
    default:
      return <BarChart3 className="h-4 w-4 text-gray-500" />;
  }
}

export default function FullLengthHistoryPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = (router.query.subject as string) || undefined;
  const from = (router.query.from as string) || undefined; // "analytics" | "study" – where we came from

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: response, isLoading } = useQuery<{
    success: boolean;
    data: TestHistoryEntry[];
  }>({
    queryKey: ["testHistory", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/test-history?subjectId=${subjectId}`
        : "/api/user/test-history";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch test history");
      return res.json();
    },
    enabled: isAuthenticated && !!router.isReady,
  });

  // Ordering rules for test history:
  // - Diagnostic quiz is always test #1 at the top (if it exists)
  // - All other tests are numbered starting from #2
  // - Non-diagnostic tests are ordered oldest → newest (older tests at the bottom)
  const tests = (() => {
    const list = response?.data ?? [];
    const toMs = (t: TestHistoryEntry) => safeDateParse(t.date)?.getTime() ?? 0;

    const diagnosticTests = list.filter((t) => t.type === "diagnostic").sort((a, b) => toMs(a) - toMs(b));
    const diagnostic = diagnosticTests[0];

    const otherTests = list
      .filter((t) => t !== diagnostic)
      .sort((a, b) => toMs(a) - toMs(b)); // oldest first, newer at the bottom

    if (!diagnostic) {
      // No diagnostic quiz present: just number all tests oldest → newest
      return otherTests.map((t, i) => ({ ...t, testNumber: i + 1 }));
    }

    return [
      { ...diagnostic, testNumber: 1 },
      ...otherTests.map((t, i) => ({ ...t, testNumber: i + 2 })),
    ];
  })();

  if (!router.isReady || loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-blue-600/90 dark:text-blue-400/90">Results</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              <BarChart3 className="h-7 w-7 shrink-0 text-blue-600 dark:text-blue-400" />
              Quiz & Test History
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {subjectId
                ? getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId ?? "")
                : "All subjects"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(subjectId ? `/study?subject=${subjectId}` : "/dashboard")}
            className="h-10 shrink-0 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            aria-label="Close history"
          >
            <X className="mr-1.5 h-4 w-4" />
            Close
          </Button>
        </header>

        {isLoading ? (
          <div className="rounded-3xl bg-slate-100 py-14 text-center dark:bg-white/[0.06]">
            <div className="text-center">
              <div className="relative mx-auto mb-4 h-11 w-11">
                <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500 dark:border-t-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</span>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="rounded-3xl bg-slate-100 px-6 py-12 text-center dark:bg-white/[0.06]">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
            <p className="font-medium text-slate-900 dark:text-white">No Tests Yet</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Complete a full-length test, diagnostic, or unit quiz to see results here.
            </p>
            <Button
              variant="ghost"
              className="mt-6 h-11 rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={() => router.push(subjectId ? `/study?subject=${subjectId}` : "/learn")}
            >
              Go to Study
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Tests Completed</h2>
            <ul className="space-y-2">
              {tests.map((test) => {
                const dateStr = formatDate(test.date);
                return (
                  <li key={`${test.type}-${test.id}`}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/full-length-results?subject=${test.subjectId}&testId=${test.id}&from=history${from ? `&returnTo=${from}` : ""}`,
                        )
                      }
                      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-4 text-left transition-colors hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                          {test.testNumber}.
                        </span>
                        {getTestTypeIcon(test.type ?? "")}
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {getTestTypeLabel(test.type ?? "")}
                            {test.type === "unit" && (() => {
                              const num = test.unitNumber ?? test.sectionBreakdown?.[test.sectionCode ?? ""]?.unitNumber;
                              const name = test.sectionBreakdown?.[test.sectionCode ?? ""]?.name;
                              if (num == null && !name) return null;
                              const unitPart =
                                name != null ? (num != null ? `Unit ${num}: ${name}` : name) : num != null ? `Unit ${num}` : null;
                              if (!unitPart) return null;
                              return (
                                <span className="ml-1 font-normal text-slate-600 dark:text-slate-300">
                                  {unitPart}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{dateStr}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono">
                        {test.score}/{test.totalQuestions} ({test.percentage}%)
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
      <SimpleFooter />
    </div>
  );
}
