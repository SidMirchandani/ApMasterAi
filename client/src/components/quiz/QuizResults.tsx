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
    if (pct >= 90) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100" };
    if (pct >= 75) return { label: "Good", color: "text-blue-600", bg: "bg-blue-100" };
    if (pct >= 60) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "Needs Work", color: "text-red-600", bg: "bg-red-100" };
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
    <div className="max-w-6xl mx-auto space-y-3">
      {/* Breadcrumb Navigation */}
      <nav className="text-sm text-gray-500 mb-4">
        Dashboard &gt; {subjectId} &gt; Test History &gt; Full Length Test
      </nav>

      <Card className="border-t-4 border-t-khan-green">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Test Results</h2>
              <p className="text-sm text-gray-500">
                {formatDateTime(new Date())}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className={`inline-block px-6 py-2 rounded-full ${overall.bg} ${overall.color} font-semibold`}>
                {overall.label}
              </div>
              <p className="text-sm text-gray-600">
                {score} out of {totalQuestions} questions correct
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <p className="text-3xl font-bold">{score}</p>
                <p className="text-sm text-gray-600 mt-1">Correct Answers</p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
                <p className="text-3xl font-bold">{totalQuestions - score}</p>
                <p className="text-sm text-gray-600 mt-1">Incorrect Answers</p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-khan-blue flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{totalQuestions}</span>
                  </div>
                </div>
                <p className="text-3xl font-bold">Total</p>
                <p className="text-sm text-gray-600 mt-1">Questions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFullLength && sectionPerformance && (
        <Card className="border-t-4 border-t-khan-blue">
          <CardHeader>
            <CardTitle>Performance by Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(sectionPerformance)
                .sort(([, a], [, b]) => (a.unitNumber || 0) - (b.unitNumber || 0))
                .map(([code, sec]) => (
                <div key={code} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-khan-green bg-khan-green/10 px-2 py-0.5 rounded">
                        Unit {sec.unitNumber || 0}
                      </span>
                      <h3 className="font-semibold">{sec.name}</h3>
                    </div>
                    <span className="font-bold text-gray-700">{sec.percentage}%</span>
                  </div>
                  <Progress value={sec.percentage} />
                  <div className="flex justify-between mt-2 text-sm text-gray-600">
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
        {/* Removed "Back to Test History" button */}
        <Button
          onClick={onReview}
          className="bg-khan-green hover:bg-khan-green/90"
        >
          Review Answers
        </Button>
      </div>
    </div>
  );
}