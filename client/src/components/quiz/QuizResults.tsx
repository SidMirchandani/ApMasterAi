import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, BookOpen } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getSectionInfo, getSubjectByCode, getSubjectByLegacyId } from "@/subjects";

// Import the QuizReviewPage component
import { QuizReviewPage } from "./QuizReviewPage";

interface Question {
  id: string;
  prompt: string;
  choices: { [key: string]: string }; // Changed from string[] to object
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
}

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  questions: Question[];
  userAnswers: { [key: number]: string };
  subjectId: string;
  isFullLength: boolean;
  onReview: () => void;
  onRetake: () => void;
  reviewMode: boolean; // Add reviewMode prop
}

export function QuizResults({
  score,
  totalQuestions,
  questions,
  userAnswers,
  subjectId,
  isFullLength,
  onReview,
  onRetake,
  reviewMode, // Destructure reviewMode
}: QuizResultsProps) {
  const router = useRouter();
  const percentage = Math.round((score / totalQuestions) * 100);

  // Destructure testId from router query, providing a default if not present
  const testId = router.query.test as string | undefined;

  const getPerformanceLevel = (pct: number) => {
    if (pct >= 90) return { label: "Excellent", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" };
    if (pct >= 75) return { label: "Good", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20" };
    if (pct >= 60) return { label: "Fair", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" };
    return { label: "Needs Work", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/20" };
  };

  const overall = getPerformanceLevel(percentage);

  // Calculate section breakdown for full-length tests
  const sectionPerformance = isFullLength ? (() => {
    // Resolve API code from legacy ID
    const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
    const apiCode = subject?.subjectCode || subjectId;
    
    const map: Record<string, { name: string; unitNumber: number; correct: number; total: number; percentage: number }> = {};

    questions.forEach((q, i) => {
      const code = q.section_code || "Unknown";

      // Use getSectionInfo with API code to resolve section code to full name
      const info = getSectionInfo(apiCode, code) || { name: code, unitNumber: 0 };

      if (!map[code]) map[code] = { name: info.name, unitNumber: info.unitNumber, correct: 0, total: 0, percentage: 0 };
      map[code].total++;
      const userAns = userAnswers[i];
      const correctAns = String.fromCharCode(65 + q.answerIndex);
      if (userAns === correctAns) map[code].correct++;
    });

    Object.values(map).forEach((s) => {
      s.percentage = Math.round((s.correct / s.total) * 100);
    });

    return map;
  })() : null;

  // Handle navigation to test history
  const handleBackToHistory = () => {
    router.push(`/full-length-history?subject=${subjectId}`);
  };

  // Handle navigation to results page (previously review mode)
  const handleBackToResults = () => {
    // This function should ideally navigate back to the test results page.
    // For now, we'll assume onReview is intended to close the review mode
    // and return to the results view. If a different navigation is needed,
    // this function should be updated accordingly.
    onReview();
  };

  // Render QuizReviewPage if reviewMode is true
  if (reviewMode) {
    return (
      <QuizReviewPage
        questions={questions}
        userAnswers={userAnswers}
        onBack={() => onReview()} // Assuming onReview can toggle reviewMode off
      />
    );
  }

  // Function to handle viewing a specific section
  const handleViewSection = (sectionCode: string) => {
    router.push(
      `/section-review?subject=${subjectId}&test=${testId}&section=${sectionCode}`
    );
  };


  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4">
      <nav className="text-sm text-slate-500 dark:text-slate-400 mb-2">
        Dashboard &gt; {subjectId} &gt; Test History &gt; Full Length Test
      </nav>

      <Card className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-lg">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500" />
        <CardContent className="pt-6 pb-6 px-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Test Results</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(new Date())}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className={`inline-flex px-5 py-2.5 rounded-xl font-semibold ${overall.bg} ${overall.color}`}>
                {overall.label}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {score} of {totalQuestions} correct
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">{score}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Correct</p>
              </div>

              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-2">
                  <XCircle className="h-10 w-10 text-rose-500" />
                </div>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">{totalQuestions - score}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Incorrect</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-2">
                  <div className="h-10 w-10 rounded-xl bg-violet-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{totalQuestions}</span>
                  </div>
                </div>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">Total</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Questions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFullLength && sectionPerformance && (
        <Card className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-violet-400" />
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-900 dark:text-white font-display">Performance by Unit</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {Object.entries(sectionPerformance)
                .sort(([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0))
                .map(([code, sec]) => (
                  <div key={code} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded-lg">
                          Unit {sec.unitNumber || 0}
                        </span>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{sec.name}</h3>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{sec.percentage}%</span>
                    </div>
                    <Progress value={sec.percentage} className="h-2" />
                    <div className="flex justify-between mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{sec.correct} correct</span>
                      <span>{sec.total} total</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button
          onClick={onReview}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
        >
          Review Answers
        </Button>
      </div>
    </div>
  );
}