import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { FullLengthQuiz } from "@/components/quiz/FullLengthQuiz";
import { PracticeQuiz } from "@/components/quiz/PracticeQuiz";
import { QuizResults } from "@/components/quiz/QuizResults";
import { QuizReviewPage } from "@/components/quiz/QuizReviewPage";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

import { getApiCodeForSubject, getSectionCodeForUnit } from "@/subjects";

export default function Quiz() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, unit } = router.query;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [savedExamState, setSavedExamState] = useState<any>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  // Timer
  useEffect(() => {
    if (quizCompleted || isReviewMode) return;
    const timer = setInterval(() => setTimeElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [quizCompleted, isReviewMode]);

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!quizCompleted && questions.length > 0 && !isReviewMode) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [quizCompleted, questions.length, isReviewMode]);

  // FETCH QUESTIONS
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!unit || !subjectId) {
        setError("Invalid quiz parameters");
        setIsLoading(false);
        return;
      }

      try {
        const subjectApiCode = getApiCodeForSubject(subjectId as string);
        if (!subjectApiCode) {
          setError(`Quiz not yet available for ${subjectId}`);
          setIsLoading(false);
          return;
        }

        const isFullLength = unit === "full-length";

        // Check for saved exam state for full-length tests
        if (isFullLength) {
          try {
            const stateResponse = await apiRequest(
              "GET",
              `/api/user/subjects/${subjectId}/get-exam-state`,
            );
            if (stateResponse.ok) {
              const stateData = await stateResponse.json();
              if (stateData.success && stateData.data) {
                setSavedExamState(stateData.data);
                setShowResumeDialog(true);
                setIsLoading(false);
                return; // Don't fetch questions yet
              }
            }
          } catch (err) {
            console.log("No saved exam state found");
          }
        }

        if (isFullLength) {
          const questionLimit = subjectApiCode === 'APMICRO' || subjectApiCode === 'APCHEM' ? 60 : 50;
          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&limit=${questionLimit}`,
          );
          if (!response.ok) throw new Error("Failed to fetch questions");
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            setQuestions(data.data);
          } else setError("No questions found for this subject");
        } else {
          const sectionCode = getSectionCodeForUnit(subjectId as string, unit as string);
          console.log("🔍 [Quiz] Unit mapping lookup:", {
            subjectId,
            unit,
            sectionCode
          });

          if (!sectionCode) {
            console.error("❌ [Quiz] No section code found for unit:", unit);
            setError("Invalid unit");
            setIsLoading(false);
            return;
          }

          const apiUrl = `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=25`;
          console.log("📡 [Quiz] Fetching questions:", apiUrl);

          const response = await apiRequest("GET", apiUrl);
          if (!response.ok) throw new Error("Failed to fetch");
          const data = await response.json();

          console.log("📥 [Quiz] API response:", {
            success: data.success,
            questionCount: data.data?.length || 0,
            firstQuestion: data.data?.[0] ? {
              id: data.data[0].id,
              subject_code: data.data[0].subject_code,
              section_code: data.data[0].section_code
            } : null
          });

          if (data.success && data.data?.length > 0) {
            const shuffled = [...data.data].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, 25));
          } else {
            console.error("❌ [Quiz] No questions found in response");
            setError("No questions found");
          }
        }
      } catch (err) {
        setError("Failed to load quiz questions");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && unit && subjectId) fetchQuestions();
  }, [isAuthenticated, unit, subjectId]);

  const isFullLength = unit === "full-length";

  const handleExitQuiz = () => {
    // Force navigation to study page
    router.replace(`/study?subject=${subjectId}`);
  };

  const handleSubmitFullLength = async (finalAnswers?: { [key: number]: string }) => {
    const answersToUse = finalAnswers || userAnswers;
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = answersToUse[i];
      const correctAns = String.fromCharCode(65 + q.answerIndex);
      if (userAns === correctAns) correct++;
    });

    const percentage = Math.round((correct / questions.length) * 100);

    // Save the test results
    try {
      const response = await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/full-length-test`,
        {
          score: correct,
          percentage,
          totalQuestions: questions.length,
          questions,
          userAnswers: answersToUse,
        },
      );

      if (response.ok) {
        const data = await response.json();
        const testId = data.data?.id;

        // Clear saved exam state after submission
        await apiRequest(
          "DELETE",
          `/api/user/subjects/${subjectId}/delete-exam-state`,
        );
        setSavedExamState(null);

        // Redirect to the full-length results page
        if (testId) {
          router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
        }
      }
    } catch (error) {
      console.error("Failed to save test results:", error);
      // Fall back to showing results on the same page if save fails
      setScore(correct);
      setQuizCompleted(true);
    }
  };

  const handleCompletePractice = (finalScore: number) => {
    setScore(finalScore);
    setQuizCompleted(true);
  };

  const handleRetakeQuiz = () => {
    setScore(0);
    setQuizCompleted(false);
    setIsReviewMode(false);
    setUserAnswers({});
    setTimeElapsed(0);
    setQuestions((q) => [...q].sort(() => Math.random() - 0.5));
  };

  const handleSaveAndExit = async (examState: any) => {
    try {
      await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/save-exam-state`,
        { examState }
      );
      router.push(`/study?subject=${subjectId}`);
    } catch (error) {
      console.error("Failed to save exam state:", error);
    }
  };

  const handleResumeExam = async () => {
    setShowResumeDialog(false);
    setIsLoading(true);

    // Restore timer state
    if (savedExamState) {
      setTimeElapsed(savedExamState.timeElapsed || 0);
    }

    // Fetch questions
    try {
      const subjectApiCode = getApiCodeForSubject(subjectId as string);
      if (!subjectApiCode) throw new Error("Invalid subject");

      const questionLimit = subjectApiCode === 'APMICRO' || subjectApiCode === 'APCHEM' ? 60 : 50;
      const response = await apiRequest(
        "GET",
        `/api/questions?subject=${subjectApiCode}&limit=${questionLimit}`,
      );
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setQuestions(data.data);
      } else {
        setError("No questions found for this subject");
      }
    } catch (err) {
      setError("Failed to load quiz questions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewExam = async () => {
    // Delete saved state
    try {
      await apiRequest(
        "DELETE",
        `/api/user/subjects/${subjectId}/delete-exam-state`,
      );
    } catch (error) {
      console.error("Failed to delete saved exam state:", error);
    }

    setSavedExamState(null);
    setShowResumeDialog(false);

    // Continue with normal flow - trigger useEffect to fetch questions
    setIsLoading(true);

    // Fetch questions
    try {
      const subjectApiCode = getApiCodeForSubject(subjectId as string);
      if (!subjectApiCode) throw new Error("Invalid subject");

      const questionLimit = subjectApiCode === 'APMICRO' || subjectApiCode === 'APCHEM' ? 60 : 50;
      const response = await apiRequest(
        "GET",
        `/api/questions?subject=${subjectApiCode}&limit=${questionLimit}`,
      );
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setQuestions(data.data);
      } else {
        setError("No questions found for this subject");
      }
    } catch (err) {
      setError("Failed to load quiz questions");
    } finally {
      setIsLoading(false);
    }
  };

  // Save score for practice tests only (full-length handled in submit)
  useEffect(() => {
    const saveScore = async () => {
      if (!quizCompleted || !subjectId || !unit || isFullLength) return;
      const pct = Math.round((score / questions.length) * 100);
      try {
        await apiRequest(
          "PUT",
          `/api/user/subjects/${subjectId}/unit-progress`,
          { unitId: unit, mcqScore: pct },
        );
      } catch (e) {}
    };
    saveScore();
  }, [
    quizCompleted,
    subjectId,
    unit,
    score,
    questions.length,
    isFullLength,
  ]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <Button onClick={() => router.push(`/study?subject=${subjectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Study
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted && !isReviewMode) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-4">
          <QuizResults
            score={score}
            totalQuestions={questions.length}
            questions={questions}
            userAnswers={userAnswers}
            subjectId={subjectId as string}
            isFullLength={isFullLength}
            onReview={() => setIsReviewMode(true)}
            onRetake={handleRetakeQuiz}
          />
        </div>
      </div>
    );
  }

  if (isReviewMode) {
    return (
      <QuizReviewPage
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onBack={() => setIsReviewMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-khan-background">
      {/* No navigation bar in quiz mode */}
      {isFullLength ? (
        <FullLengthQuiz
          questions={questions}
          subjectId={subjectId as string}
          timeElapsed={timeElapsed}
          onExit={handleExitQuiz}
          onSubmit={handleSubmitFullLength}
          onSaveAndExit={handleSaveAndExit}
          savedState={savedExamState}
        />
      ) : (
        <PracticeQuiz
          questions={questions}
          subjectId={subjectId as string}
          timeElapsed={timeElapsed}
          onExit={handleExitQuiz}
          onComplete={handleCompletePractice}
        />
      )}

      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Previous Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a saved exam in progress. Would you like to continue where you left off or start a new exam?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartNewExam}>
              Start New Exam
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeExam}>
              Resume Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}