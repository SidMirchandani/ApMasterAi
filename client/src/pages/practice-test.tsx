import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { Target, Clock, BarChart3, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PracticeTest() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0B0F1A]">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-11 w-11">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getTestName = (testId: string) => {
    const testMap: Record<string, string> = {
      "calculus-ab": "AP Calculus AB Practice Test",
      "calculus-bc": "AP Calculus BC Practice Test",
      biology: "AP Biology Practice Test",
      chemistry: "AP Chemistry Practice Test",
      "physics-1": "AP Physics 1 Practice Test",
      "us-history": "AP U.S. History Practice Test",
      "world-history": "AP World History Practice Test",
      "english-language": "AP English Language Practice Test",
      "english-literature": "AP English Literature Practice Test",
      psychology: "AP Psychology Practice Test",
    };
    return testMap[testId] || "AP Practice Test";
  };

  const testId: string = Array.isArray(id) ? (id[0] || "") : (id || "");
  const testName: string = getTestName(testId);

  const tiles = [
    { icon: Target, title: "55 questions", subtitle: "Multiple choice" },
    { icon: Clock, title: "3h 15m", subtitle: "Exam-style timing" },
    { icon: BarChart3, title: "Analytics", subtitle: "Performance insights" },
    { icon: CheckCircle, title: "Instant feedback", subtitle: "With explanations" },
  ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1 mb-6 h-10 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          asChild
        >
          <Link href="/learn">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Browse courses
          </Link>
        </Button>

        <header className="mb-8 space-y-2">
          <p className="text-sm font-medium text-blue-600/90 dark:text-blue-400/90">Practice test</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {testName}
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            Real AP-style questions and instant feedback—coming soon as a dedicated flow. Use Full-Length MCQ from Study for now.
          </p>
        </header>

        <div className="space-y-6 rounded-3xl bg-slate-100 px-5 py-6 dark:bg-white/[0.06] sm:px-8 sm:py-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map(({ icon: Icon, title, subtitle }) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-blue-600 dark:bg-white/[0.08] dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/80 pt-6 text-center dark:border-white/[0.08]">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Coming soon</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
              We&apos;re building dedicated practice tests with diagnostics. Stay tuned.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button disabled variant="ghost" className="h-11 rounded-full bg-slate-200/80 text-slate-500 dark:bg-white/[0.08]">
                Start practice test
              </Button>
              <Button disabled variant="ghost" className="h-11 rounded-full bg-slate-200/80 text-slate-500 dark:bg-white/[0.08]">
                Quick diagnostic (15 min)
              </Button>
            </div>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}
