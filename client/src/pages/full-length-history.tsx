import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ArrowLeft, FileQuestion, ClipboardList, BookOpen } from "lucide-react";
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
      return "Full Length MCQ Quiz";
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navigation />
      <div className="container mx-auto px-4 py-4 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(subjectId ? `/analytics?subject=${subjectId}` : "/dashboard")}
            className="rounded-full"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-500" />
              Test History
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subjectId ? `Subject: ${getSubjectDisplayName(getApiCodeForSubject(subjectId) ?? subjectId ?? "")}` : "All subjects"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading test history…
            </CardContent>
          </Card>
        ) : tests.length === 0 ? (
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">No tests yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Complete a full-length test, diagnostic, or unit quiz to see results here.
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push(subjectId ? `/study?subject=${subjectId}` : "/dashboard")}
              >
                Go to study
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg dark:text-gray-100">Tests completed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tests.map((test) => {
                const dateStr = formatDate(test.date);
                return (
                  <div
                    key={`${test.type}-${test.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        `/full-length-results?subject=${test.subjectId}&testId=${test.id}`,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(
                          `/full-length-results?subject=${test.subjectId}&testId=${test.id}`,
                        );
                      }
                    }}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-6 text-sm font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                        {test.testNumber}.
                      </span>
                      {getTestTypeIcon(test.type ?? "")}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {getTestTypeLabel(test.type ?? "")}
                            {test.type === "unit" && (() => {
                              const num = test.unitNumber ?? test.sectionBreakdown?.[test.sectionCode ?? ""]?.unitNumber;
                              const name = test.sectionBreakdown?.[test.sectionCode ?? ""]?.name;
                              if (num == null && !name) return null;
                              const unitPart = name != null ? (num != null ? `Unit ${num}: ${name}` : name) : (num != null ? `Unit ${num}` : null);
                              if (!unitPart) return null;
                              return (
                                <span className="text-gray-600 dark:text-gray-300 font-normal ml-1">
                                  {" "}{unitPart}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{dateStr}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">
                        {test.score}/{test.totalQuestions} ({test.percentage}%)
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
      <SimpleFooter />
    </div>
  );
}
