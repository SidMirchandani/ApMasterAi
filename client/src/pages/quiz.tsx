import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, ArrowRight, MoreVertical, Highlighter, FileText, Calculator, BookOpen, HelpCircle, Printer, LogOut, Flag, ChevronUp } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

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
    // Removed 'choices' here as per the correction
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

// Map subject IDs to their API codes
const SUBJECT_API_CODES: Record<string, string> = {
  macroeconomics: "APMACRO",
  microeconomics: "APMICRO",
  "computer-science-principles": "APCSP",
  "calculus-ab": "APCALCAB",
  "calculus-bc": "APCALCBC",
  biology: "APBIO",
};

// Map subject IDs to their unit-section mappings
const SUBJECT_UNIT_MAPS: Record<string, Record<string, string>> = {
  macroeconomics: {
    unit1: "BEC",
    unit2: "EIBC",
    unit3: "NIPD",
    unit4: "FS",
    unit5: "LRCSP",
    unit6: "OEITF",
  },
  microeconomics: {
    unit1: "BEC",
    unit2: "SD",
    unit3: "PCCPM",
    unit4: "IC",
    unit5: "FM",
    unit6: "MFROG",
  },
  "computer-science-principles": {
    bigidea1: "CD",
    bigidea2: "DATA",
    bigidea3: "AAP",
    bigidea4: "CSN",
    bigidea5: "IOC",
  },
  "calculus-ab": {
    unit1: "LC",
    unit2: "DDFP",
    unit3: "DCIF",
    unit4: "CAD",
    unit5: "AAD",
    unit6: "IAC",
    unit7: "DE",
    unit8: "AI",
  },
  "calculus-bc": {
    unit1: "LC",
    unit2: "DDFP",
    unit3: "DCIF",
    unit4: "CAD",
    unit5: "AAD",
    unit6: "IAC",
    unit7: "DE",
    unit8: "AI",
  },
  biology: {
    unit1: "COL",
    unit2: "CSF",
    unit3: "CE",
    unit4: "CCCC",
    unit5: "HER",
    unit6: "GER",
    unit7: "NS",
    unit8: "ECO",
  },
};

export default function Quiz() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, unit } = router.query;
  const isMobile = useIsMobile();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Mock functions for navigation and submission to be replaced later
  const handleExitTest = () => {
    setShowExitDialog(true);
  };
  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  // Timer
  useEffect(() => {
    if (quizCompleted || isReviewMode) return;
    
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizCompleted, isReviewMode]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Add beforeunload handler to warn about losing progress
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

  const handleBackClick = () => {
    // For full-length quiz or any incomplete quiz with questions, show warning
    if (!quizCompleted && questions.length > 0 && !isReviewMode) {
      setShowExitDialog(true);
    } else {
      router.push(`/study?subject=${subjectId}`);
    }
  };

  const confirmExit = () => {
    router.push(`/study?subject=${subjectId}`);
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!unit || !subjectId) {
        setError("Invalid quiz parameters");
        setIsLoading(false);
        return;
      }

      try {
        const subjectApiCode = SUBJECT_API_CODES[subjectId as string];
        if (!subjectApiCode) {
          setError(`Quiz not yet available for ${subjectId}`);
          setIsLoading(false);
          return;
        }

        // Check if this is a full-length quiz
        const isFullLength = unit === "full-length";

        if (isFullLength) {
          // For full-length quiz, fetch ALL questions without section filter
          console.log("📤 Fetching ALL questions for full-length quiz:", {
            subject: subjectApiCode,
            limit: 50,
          });

          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&limit=50`,
          );

          if (!response.ok) {
            throw new Error("Failed to fetch questions");
          }

          const data = await response.json();

          console.log("📥 Full-length quiz questions:", {
            success: data.success,
            totalQuestions: data.data?.length || 0,
          });

          if (data.success && data.data && data.data.length > 0) {
            // Use all questions returned from proportional distribution
            setQuestions(data.data);
          } else {
            setError("No questions found for this subject");
          }
        } else {
          // Regular unit quiz - existing logic
          const unitMap = SUBJECT_UNIT_MAPS[subjectId as string];
          if (!unitMap) {
            setError(`Quiz not yet available for ${subjectId}`);
            setIsLoading(false);
            return;
          }

          const sectionCode = unitMap[unit as string];
          if (!sectionCode) {
            setError("Invalid unit");
            setIsLoading(false);
            return;
          }

          console.log("📤 Fetching questions with params:", {
            subject: subjectApiCode,
            section: sectionCode,
            unit: unit,
            limit: 25,
          });

          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=25`,
          );

          if (!response.ok) {
            throw new Error("Failed to fetch questions");
          }

          const data = await response.json();

          console.log("📥 Questions API response:", {
            success: data.success,
            questionCount: data.data?.length || 0,
            firstQuestion: data.data?.[0]
              ? {
                  id: data.data[0].id,
                  prompt: data.data[0].prompt?.substring(0, 50) + "...",
                  hasChoices:
                    Array.isArray(data.data[0].choices) &&
                    data.data[0].choices.length > 0,
                }
              : null,
          });

          if (data.success && data.data && data.data.length > 0) {
            // Shuffle and select up to 25 questions
            const shuffled = [...data.data].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, 25));
          } else {
            setError("No questions found for this unit");
          }
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("Failed to load quiz questions");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && unit && subjectId) {
      fetchQuestions();
    }
  }, [isAuthenticated, unit, subjectId]);

  const isFullLength = unit === "full-length";
  const questionsPerPage = isFullLength ? 5 : 1; // Set to 10 questions per page for full-length
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const currentQuestions = isFullLength
    ? questions.slice(
        currentPage * questionsPerPage,
        (currentPage + 1) * questionsPerPage,
      )
    : [questions[currentQuestionIndex]];

  const currentQuestion = questions[currentQuestionIndex];
  const progress = isFullLength
    ? ((currentPage + 1) / totalPages) * 100
    : ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer: string, questionIndex?: number) => {
    if (isReviewMode) return; // Disable selection in review mode

    if (isFullLength && questionIndex !== undefined) {
      const globalIndex = currentPage * questionsPerPage + questionIndex;
      setUserAnswers((prev) => ({ ...prev, [globalIndex]: answer }));
    } else if (!isAnswerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const toggleFlag = (questionIndex: number) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;

    setIsAnswerSubmitted(true);
    const correctAnswerLabel = String.fromCharCode(
      65 + currentQuestion.answerIndex,
    );
    if (selectedAnswer === correctAnswerLabel) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      if (isFullLength) {
        // Reset selections for the new page if not in review mode
        if (!isReviewMode) {
          setSelectedAnswer(null);
          setIsAnswerSubmitted(false);
        }
      }
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const confirmSubmitFullLength = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      const correctAnswerLabel = String.fromCharCode(65 + q.answerIndex);
      if (userAnswer === correctAnswerLabel) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setQuizCompleted(true);
    setShowSubmitConfirm(false);
    // Don't set isReviewMode here - let user see summary first
  };

  const handleReviewUnit = (sectionCode: string) => {
    const unitQuestions = questions.filter(
      (q) => q.section_code === sectionCode,
    );
    const unitAnswers: { [key: number]: string } = {};

    questions.forEach((q, idx) => {
      if (q.section_code === sectionCode) {
        unitAnswers[idx] = userAnswers[idx];
      }
    });

    // Navigate to section review with current test data
    router.push({
      pathname: "/section-review",
      query: {
        subject: subjectId,
        testId: "current",
        section: sectionCode,
        data: JSON.stringify({
          questions: unitQuestions,
          userAnswers: unitAnswers,
          score,
          totalQuestions: questions.length,
        }),
      },
    });
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    setIsReviewMode(false); // Exit review mode
    setUserAnswers({}); // Clear user answers
    setCurrentPage(0); // Reset to first page
    // Reshuffle questions
    setQuestions([...questions].sort(() => Math.random() - 0.5));
  };

  // Save score when quiz is completed
  useEffect(() => {
    const saveScore = async () => {
      if (quizCompleted && subjectId && unit) {
        const percentage = Math.round((score / questions.length) * 100);
        console.log("💾 [Quiz] Attempting to save score:", {
          subjectId,
          unit,
          score,
          total: questions.length,
          percentage,
          isFullLength,
        });
        try {
          // For full-length exams, save complete test data
          if (isFullLength) {
            const response = await apiRequest(
              "POST",
              `/api/user/subjects/${subjectId}/full-length-test`,
              {
                score,
                percentage,
                totalQuestions: questions.length,
                questions,
                userAnswers,
              },
            );
            console.log("✅ [Quiz] Full-length test saved successfully");
          } else {
            // Regular unit quiz
            const response = await apiRequest(
              "PUT",
              `/api/user/subjects/${subjectId}/unit-progress`,
              { unitId: unit, mcqScore: percentage },
            );
            console.log("✅ [Quiz] Score saved successfully:", percentage);
          }
        } catch (error) {
          console.error("❌ [Quiz] Failed to save score:", error);
        }
      }
    };

    saveScore();
  }, [
    quizCompleted,
    subjectId,
    unit,
    score,
    questions.length,
    isFullLength,
    questions,
    userAnswers,
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
    const percentage = Math.round((score / questions.length) * 100);

    // Calculate section-wise performance for full-length test
    const sectionPerformance = isFullLength
      ? (() => {
          const sections: Record<
            string,
            {
              name: string;
              correct: number;
              total: number;
              percentage: number;
            }
          > = {};

          // Section code to name mapping
          const sectionNames: Record<string, string> = {
            BEC: "Basic Economic Concepts",
            EIBC: "Economic Indicators & Business Cycle",
            NIPD: "National Income & Price Determination",
            FS: "Financial Sector",
            LRCSP: "Long-Run Consequences of Stabilization Policies",
            OEITF: "Open Economy - International Trade & Finance",
            // Add more mappings as needed for other subjects
          };

          questions.forEach((q, idx) => {
            const sectionCode = q.section_code || "Unknown";
            const sectionName = sectionNames[sectionCode] || sectionCode;

            if (!sections[sectionCode]) {
              sections[sectionCode] = {
                name: sectionName,
                correct: 0,
                total: 0,
                percentage: 0,
              };
            }

            sections[sectionCode].total++;

            const userAnswer = userAnswers[idx];
            const correctAnswerLabel = String.fromCharCode(65 + q.answerIndex);
            if (userAnswer === correctAnswerLabel) {
              sections[sectionCode].correct++;
            }
          });

          // Calculate percentages
          Object.values(sections).forEach((section) => {
            section.percentage = Math.round(
              (section.correct / section.total) * 100,
            );
          });

          return sections;
        })()
      : null;

    // Performance level indicator
    const getPerformanceLevel = (pct: number) => {
      if (pct >= 90)
        return {
          label: "Excellent",
          color: "text-green-600",
          bgColor: "bg-green-100",
        };
      if (pct >= 75)
        return {
          label: "Good",
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        };
      if (pct >= 60)
        return {
          label: "Fair",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
        };
      return {
        label: "Needs Work",
        color: "text-red-600",
        bgColor: "bg-red-100",
      };
    };

    const overallPerformance = getPerformanceLevel(percentage);

    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-4">
          {isFullLength ? (
            <div className="max-w-6xl mx-auto space-y-3">
              {/* Header Card */}
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
                      <div
                        className={`inline-block px-6 py-2 rounded-full ${overallPerformance.bgColor} ${overallPerformance.color} font-semibold`}
                      >
                        {overallPerformance.label}
                      </div>
                      <p className="text-sm text-gray-600">
                        {score} out of {questions.length} questions correct
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <CheckCircle className="h-12 w-12 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {score}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Correct Answers
                        </p>
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <XCircle className="h-12 w-12 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {questions.length - score}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Incorrect Answers
                        </p>
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <div className="h-12 w-12 rounded-full bg-khan-blue flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                              {questions.length}
                            </span>
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          Total
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Questions</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section Performance Breakdown */}
              {sectionPerformance && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="text-khan-blue h-4 w-4" />
                      Section Performance Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(sectionPerformance).map(
                        ([sectionCode, section], idx) => {
                          const sectionPerf = getPerformanceLevel(
                            section.percentage,
                          );
                          return (
                            <div
                              key={idx}
                              className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-khan-green"
                              onClick={() =>
                                sectionCode && handleReviewUnit(sectionCode)
                              }
                            >
                              <div className="flex justify-between items-center gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm text-gray-900">
                                      {section.name}
                                    </h3>
                                    <span className="text-xs text-gray-600">
                                      ({section.correct}/{section.total})
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`px-3 py-0.5 rounded-full ${sectionPerf.bgColor} ${sectionPerf.color} text-xs font-medium`}
                                >
                                  {section.percentage}%
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    section.percentage >= 75
                                      ? "bg-green-500"
                                      : section.percentage >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${section.percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => setIsReviewMode(true)}
                      className="bg-khan-blue hover:bg-khan-blue/90 px-8"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Review Answers
                    </Button>
                    <Button
                      onClick={handleRetakeQuiz}
                      className="bg-khan-green hover:bg-khan-green/90 px-8"
                    >
                      Retake Test
                    </Button>
                    <Button
                      onClick={() => router.push(`/study?subject=${subjectId}`)}
                      variant="outline"
                      className="px-4"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Regular quiz completion screen
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  Quiz Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="text-6xl font-bold text-khan-green mb-2">
                    {percentage}%
                  </div>
                  <p className="text-xl text-gray-600">
                    You scored {score} out of {questions.length}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleRetakeQuiz}
                    className="bg-khan-green hover:bg-khan-green/90"
                  >
                    Retake Quiz
                  </Button>
                  <Button
                    onClick={() => router.push(`/study?subject=${subjectId}`)}
                    variant="outline"
                  >
                    Exit Practice Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Review mode for full-length test
  if (isReviewMode && isFullLength) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 md:px-8 py-3 max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Button
                onClick={() => setIsReviewMode(false)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className={isMobile ? "" : "h-4 w-4 mr-1"} />
                {!isMobile && "Back to Results"}
              </Button>
              <h2 className="text-base md:text-xl font-semibold absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {isMobile
                  ? "Full Review"
                  : `Review - Page ${currentPage + 1} of ${totalPages} (Questions ${currentPage * questionsPerPage + 1}-${Math.min((currentPage + 1) * questionsPerPage, questions.length)})`}
              </h2>
              <div className="text-lg font-semibold text-khan-green">
                {!isMobile && "Final Score: "}
                {score}/{questions.length}
              </div>
            </div>
            <Progress
              value={((currentPage + 1) / totalPages) * 100}
              className="h-2"
            />
          </div>

          {/* Question Navigation Box */}
          <Card className="mb-4 sticky top-0 z-10 bg-white shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-khan-gray-dark">
                Question Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 justify-center">
                {questions
                  .slice(
                    currentPage * questionsPerPage,
                    (currentPage + 1) * questionsPerPage,
                  )
                  .map((q, idx) => {
                    const globalIndex = currentPage * questionsPerPage + idx;
                    const userAnswer = userAnswers[globalIndex];
                    const correctAnswerLabel = String.fromCharCode(
                      65 + q.answerIndex,
                    );
                    const isCorrect = userAnswer === correctAnswerLabel;

                    return (
                      <button
                        key={globalIndex}
                        onClick={() => {
                          const element = document.getElementById(
                            `review-question-${globalIndex}`,
                          );
                          element?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                        className={`relative w-10 h-10 rounded-md font-semibold text-sm flex items-center justify-center transition-all ${
                          isCorrect
                            ? "bg-green-100 border-2 border-green-500 text-green-700"
                            : "bg-red-100 border-2 border-red-500 text-red-700"
                        }`}
                      >
                        <span className="relative z-10">{globalIndex + 1}</span>
                        {flaggedQuestions.has(globalIndex) && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute top-0 right-0 h-3.5 w-3.5 text-red-600"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Review Questions - Compact */}
          <div className="space-y-4 mb-6">
            {currentQuestions.map((q, idx) => {
              const globalIndex = currentPage * questionsPerPage + idx;
              const options = q.choices.map((choice, i) => ({
                label: String.fromCharCode(65 + i),
                value: choice,
              }));
              const correctAnswerLabel = String.fromCharCode(
                65 + q.answerIndex,
              );
              const isCorrect =
                userAnswers[globalIndex] === correctAnswerLabel;

              return (
                <Card
                  key={globalIndex}
                  id={`review-question-${globalIndex}`}
                  className="border"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium leading-relaxed">
                      {globalIndex + 1}. {q.prompt}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {options.map((option) => {
                        const choiceKey = option.label as 'A' | 'B' | 'C' | 'D' | 'E';
                        const choiceImages = q.image_urls?.choices?.[choiceKey];
                        const hasImage = choiceImages && Array.isArray(choiceImages) && choiceImages.length > 0;
                        const hasText = option.value && option.value.trim() !== "";
                        const isEmpty = !hasImage && !hasText;

                        // Hide choice E if it's empty
                        if (isEmpty && option.label === 'E') {
                          return null;
                        }

                        const isUserAnswer = userAnswers[globalIndex] === option.label;
                        const isCorrectAnswer =
                          option.label === correctAnswerLabel;

                        return (
                          <div
                            key={option.label}
                            className={`w-full text-left p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? "border-green-500 bg-green-50"
                                : isUserAnswer && !isCorrect
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-semibold text-sm ${
                                  isCorrectAnswer
                                    ? "bg-green-500 text-white"
                                    : isUserAnswer && !isCorrect
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {option.label}
                              </div>
                              <div className="flex-1 text-sm pt-0.5">
                                {q.image_urls?.[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] &&
                                 Array.isArray(q.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E']) &&
                                 (q.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] as string[]).length > 0 && (
                                  <div className="mb-2 space-x-1 inline-flex flex-wrap">
                                    {(q.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] as string[]).map((imageUrl, imgIdx) => (
                                      <div key={imgIdx} className="group relative inline-block">
                                        <img
                                          src={imageUrl}
                                          alt={`Choice ${option.label} image ${imgIdx + 1}`}
                                          className="h-10 w-auto rounded border border-gray-300 cursor-pointer"
                                        />
                                        <img
                                          src={imageUrl}
                                          alt={`Choice ${option.label} image ${imgIdx + 1} enlarged`}
                                          className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {option.value && <span>{option.value}</span>}
                              </div>
                              {isCorrectAnswer && (
                                <CheckCircle className="text-green-500 flex-shrink-0 h-5 w-5" />
                              )}
                              {isUserAnswer && !isCorrect && (
                                <XCircle className="text-red-500 flex-shrink-0 h-5 w-5" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Show user's answer status */}
                    <div
                      className={`p-2 rounded-lg text-sm ${isCorrect ? "bg-green-100" : "bg-red-100"}`}
                    >
                      <p className="font-semibold">
                        Your answer: {userAnswers[globalIndex] || "Not answered"}
                        {isCorrect
                          ? " ✓ Correct"
                          : ` ✗ Incorrect (Correct: ${correctAnswerLabel})`}
                      </p>
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <Card className="border-khan-blue bg-blue-50">
                        <CardHeader className="pb-2 pt-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle className="text-khan-blue h-4 w-4" />
                            Explanation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {q.explanation}
                            </ReactMarkdown>
                          </div>
                          <ExplanationChat
                            questionPrompt={q.prompt}
                            explanation={q.explanation}
                            correctAnswer={q.choices[q.answerIndex]}
                            choices={q.choices}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Review Navigation */}
          <div className="flex justify-between gap-4">
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              variant="outline"
              className="px-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentPage === totalPages - 1 ? (
              <Button
                onClick={() => router.push(`/study?subject=${subjectId}`)}
                className="bg-khan-green hover:bg-khan-green/90"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNextPage}
                className="bg-khan-blue hover:bg-khan-blue/90 px-8"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const options = currentQuestion.choices.map((choice, index) => ({
    label: String.fromCharCode(65 + index), // A, B, C, D, E
    value: choice,
  }));

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Title and Directions */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-khan-gray-dark hidden sm:inline">APMaster</span>
            </Link>
            <span className="text-gray-300">|</span>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">
                {isFullLength ? "Full-Length Practice Exam" : `Unit ${unit} Practice Quiz`}
              </h1>
              <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                Directions <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatTime(timeElapsed)}</div>
            <button className="text-xs text-gray-500 hover:text-gray-700 underline">Hide</button>
          </div>

          {/* Right: Tools */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Highlighter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Calculator className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <BookOpen className="h-4 w-4" />
            </Button>
            <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Exam
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Shortcuts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowExitDialog(true)} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit the Exam
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header - Only for regular quiz */}
        {!isFullLength && (
          <div className="mb-2">
            {!isFullLength && (
              <AlertDialog
                open={showExitDialog}
                onOpenChange={setShowExitDialog}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Full-Length Test?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your progress on this unit practice quiz will be lost if
                      you leave now. Are you sure you want to exit?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Continue Practice Quiz
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmExit}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Exit Practice Quiz
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex flex-col items-center mb-1 gap-1">
              <Button
                onClick={() => setShowExitDialog(true)}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Exit Practice Quiz
              </Button>
              <div className="flex justify-between items-center w-full">
                <h2 className="text-lg font-semibold">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <div className="text-base font-semibold text-khan-green">
                  Score: {score}/
                  {currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)}
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Alert Dialog for Full-Length Test */}
        {isFullLength && (
          <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Full-Length Test?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress on this full-length test will be lost if you
                  leave now. Are you sure you want to exit?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Full-Length Test</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmExit}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Exit Full-Length Test
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {isFullLength ? (
          <>
            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-4 py-6 pb-24">

                  {/* Second Line: Previous button, numbered boxes, Next button */}
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 0}
                      variant="outline"
                      className={isMobile ? "px-3" : "px-8"}
                    >
                      <ArrowLeft className={isMobile ? "" : "mr-2 h-4 w-4"} />
                      {!isMobile && "Previous"}
                    </Button>

                    <div className="flex items-center justify-center gap-1 flex-wrap absolute left-1/2 transform -translate-x-1/2">
                      {questions
                        .slice(
                          currentPage * questionsPerPage,
                          (currentPage + 1) * questionsPerPage,
                        )
                        .map((_, idx) => {
                          const globalIndex =
                            currentPage * questionsPerPage + idx;
                          const isAnswered =
                            userAnswers[globalIndex] !== undefined;
                          const isFlagged = flaggedQuestions.has(globalIndex);

                          return (
                            <button
                              key={globalIndex}
                              onClick={() => {
                                const element = document.getElementById(
                                  `question-${globalIndex}`,
                                );
                                element?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                              }}
                              className={`relative w-8 h-8 rounded-md font-semibold text-xs flex items-center justify-center transition-all ${
                                isAnswered
                                  ? "bg-gray-200 border-2 border-gray-400 text-gray-700"
                                  : "bg-white border-2 border-gray-300 text-gray-500"
                              }`}
                            >
                              <span className="relative z-10">
                                {globalIndex + 1}
                              </span>
                              {isFlagged && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="absolute top-0 right-0 h-2.5 w-2.5 text-red-600"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                    </div>

                    <Button
                      onClick={() =>
                        currentPage === totalPages - 1
                          ? setShowSubmitConfirm(true)
                          : setCurrentPage(currentPage + 1)
                      }
                      disabled={currentPage === totalPages - 1}
                      className={
                        currentPage === totalPages - 1
                          ? `bg-gray-400 cursor-not-allowed ${isMobile ? "px-3" : "px-8"}`
                          : `bg-khan-blue hover:bg-khan-blue/90 ${isMobile ? "px-3" : "px-8"}`
                      }
                    >
                      {!isMobile &&
                        (currentPage === totalPages - 1 ? "End" : "Next")}
                      <ArrowRight className={isMobile ? "" : "ml-2 h-4 w-4"} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Full-length exam: show multiple questions per page */}
            <div className="space-y-8 mb-4">
              {currentQuestions.map((q, idx) => {
                const globalIndex = currentPage * questionsPerPage + idx;
                const options = q.choices.map((choice, i) => ({
                  label: String.fromCharCode(65 + i),
                  value: choice,
                }));

                return (
                  <Card
                    key={globalIndex}
                    id={`question-${globalIndex}`}
                    className="border-0"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <p className="text-base leading-relaxed text-gray-800">
                            {q.prompt}
                          </p>
                          {q.image_urls?.question && q.image_urls.question.length > 0 && (
                            <div className="mt-3 space-x-2 inline-flex flex-wrap">
                              {q.image_urls.question.map((imageUrl, imgIdx) => (
                                <div key={imgIdx} className="group relative inline-block">
                                  <img
                                    src={imageUrl}
                                    alt={`Question ${globalIndex + 1} image ${imgIdx + 1}`}
                                    className="h-12 w-auto rounded border border-gray-300 cursor-pointer"
                                  />
                                  <img
                                    src={imageUrl}
                                    alt={`Question ${globalIndex + 1} image ${imgIdx + 1} enlarged`}
                                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => toggleFlag(globalIndex)}
                          variant="outline"
                          size="sm"
                          className={`flex-shrink-0 h-8 ${isMobile ? "px-2" : "px-2"} ${
                            flaggedQuestions.has(globalIndex)
                              ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border-gray-300 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3.5 w-3.5 ${!isMobile ? "mr-1" : ""}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {!isMobile && (
                            <span className="text-xs">
                              {flaggedQuestions.has(globalIndex)
                                ? "Unflag"
                                : "Flag"}
                            </span>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 pb-3">
                      <div className="space-y-1.5">
                        {options.map((option) => {
                          const choiceKey = option.label as 'A' | 'B' | 'C' | 'D' | 'E';
                          const choiceImages = q.image_urls?.choices?.[choiceKey];
                          const hasImage = choiceImages && Array.isArray(choiceImages) && choiceImages.length > 0;
                          const hasText = option.value && option.value.trim() !== "";
                          const isEmpty = !hasImage && !hasText;

                          // Hide choice E if it's empty
                          if (isEmpty && option.label === 'E') {
                            return null;
                          }

                          const isSelected =
                            userAnswers[globalIndex] === option.label;

                          return (
                            <button
                              key={option.label}
                              onClick={() =>
                                handleAnswerSelect(option.label, idx)
                              }
                              className={`w-full text-left p-2 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? "border-khan-blue bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              } ${isAnswerSubmitted || isReviewMode ? "cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-semibold text-sm ${
                                    isSelected
                                      ? "bg-khan-blue text-white"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {option.label}
                                </div>
                                <div className="flex-1 text-sm pt-0.5">
                                  {q.image_urls?.[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] &&
                                   Array.isArray(q.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E']) &&
                                   (q.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] as string[]).length > 0 && (
                                    <div className="mb-2 space-x-1 inline-flex flex-wrap">
                                      {(q.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] as string[]).map((imageUrl, imgIdx) => (
                                        <div key={imgIdx} className="group relative inline-block">
                                          <img
                                            src={imageUrl}
                                            alt={`Choice ${option.label} image ${imgIdx + 1}`}
                                            className="h-10 w-auto rounded border border-gray-300 cursor-pointer"
                                          />
                                          <img
                                            src={imageUrl}
                                            alt={`Choice ${option.label} image ${imgIdx + 1} enlarged`}
                                            className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {option.value && <span>{option.value}</span>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Submit Confirmation Dialog for Full-Length Quiz */}
            <AlertDialog
              open={showSubmitConfirm}
              onOpenChange={setShowSubmitConfirm}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Full-Length Exam?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you ready to submit your exam? You have answered{" "}
                    {Object.keys(userAnswers).length} out of {questions.length}{" "}
                    questions. Once submitted, you cannot change your answers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review Answers</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmSubmitFullLength}
                    className="bg-khan-green hover:bg-khan-green/90"
                  >
                    Yes, Submit Exam
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Bottom Navigation */}
            <div className="mt-6 flex justify-between items-center gap-4">
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
                variant="outline"
                className={isMobile ? "px-3" : "px-8"}
              >
                <ArrowLeft className={isMobile ? "" : "mr-2 h-4 w-4"} />
                {!isMobile && "Previous"}
              </Button>

              {!isMobile && (
                <div className="text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </div>
              )}

              {currentPage === totalPages - 1 ? (
                <Button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="bg-khan-green hover:bg-khan-green/90 px-6"
                >
                  Submit Exam
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className={`bg-khan-blue hover:bg-khan-blue/90 ${isMobile ? "px-3" : "px-8"}`}
                >
                  {!isMobile && "Next"}
                  <ArrowRight className={isMobile ? "" : "ml-2 h-4 w-4"} />
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Regular quiz: show one question at a time */}
            <div className="max-w-5xl mx-auto px-4 py-6">
              <div className="bg-white border-0 mb-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <p className="text-base leading-relaxed text-gray-800">
                      {currentQuestion.prompt}
                    </p>
                    {currentQuestion.image_urls?.question &&
                      currentQuestion.image_urls.question.length > 0 && (
                        <div className="mt-3 space-x-2 inline-flex flex-wrap">
                          {currentQuestion.image_urls.question.map(
                            (imageUrl, imgIdx) => (
                              <div key={imgIdx} className="group relative inline-block">
                                <img
                                  src={imageUrl}
                                  alt={`Question ${
                                    currentQuestionIndex + 1
                                  } image ${imgIdx + 1}`}
                                  className="h-16 w-auto rounded border border-gray-300 cursor-pointer"
                                />
                                <img
                                  src={imageUrl}
                                  alt={`Question ${
                                    currentQuestionIndex + 1
                                  } image ${imgIdx + 1} enlarged`}
                                  className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                                />
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                  
                  {/* Mark for Review */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-gray-900 text-white px-3 py-1 rounded text-sm font-semibold">
                      {currentQuestionIndex + 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFlag(currentQuestionIndex)}
                      className={`text-xs ${
                        flaggedQuestions.has(currentQuestionIndex)
                          ? "border-red-500 text-red-600 bg-red-50"
                          : "border-gray-300"
                      }`}
                    >
                      <Flag className={`h-3 w-3 mr-1 ${flaggedQuestions.has(currentQuestionIndex) ? "fill-red-600" : ""}`} />
                      Mark for Review
                    </Button>
                    <span className="text-xs text-gray-400">MC</span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">
                    Which of the following outcomes would most likely reduce the likelihood of genetic exchange between these populations?
                  </p>
                </div>

                {/* Choices */}
                <div className="space-y-3">
                  {(() => {
                    const options = currentQuestion.choices.map(
                      (choice, index) => ({
                        label: String.fromCharCode(65 + index),
                        value: choice,
                      }),
                    );

                    return options.map((option) => {
                      const choiceKey = option.label as 'A' | 'B' | 'C' | 'D' | 'E';
                      const choiceImages = currentQuestion.image_urls?.choices?.[choiceKey];
                      const hasImage = choiceImages && Array.isArray(choiceImages) && choiceImages.length > 0;
                      const hasText = option.value && option.value.trim() !== "";
                      const isEmpty = !hasImage && !hasText;

                      // Hide choice E if it's empty
                      if (isEmpty && option.label === 'E') {
                        return null;
                      }

                      const isSelected = selectedAnswer === option.label;
                      const correctAnswerLabel = String.fromCharCode(
                        65 + currentQuestion.answerIndex,
                      );
                      const isCorrect = option.label === correctAnswerLabel;
                      const showCorrect = isAnswerSubmitted && isCorrect;
                      const showIncorrect =
                        isAnswerSubmitted && isSelected && !isCorrect;

                      return (
                        <button
                          key={option.label}
                          onClick={() => handleAnswerSelect(option.label)}
                          disabled={isAnswerSubmitted || isReviewMode}
                          className={`w-full text-left p-2 rounded-lg border-2 transition-all ${
                            showCorrect
                              ? "border-green-500 bg-green-50"
                              : showIncorrect
                                ? "border-red-500 bg-red-50"
                                : isSelected
                                  ? "border-khan-blue bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                          } ${isAnswerSubmitted || isReviewMode ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-semibold text-xs ${
                                showCorrect
                                  ? "bg-green-500 text-white"
                                  : showIncorrect
                                    ? "bg-red-500 text-white"
                                    : isSelected
                                      ? "bg-khan-blue text-white"
                                      : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {option.label}
                            </div>
                            <div className="flex-1 pt-0.5 text-sm">
                              {currentQuestion.image_urls?.[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] &&
                               Array.isArray(currentQuestion.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E']) &&
                               (currentQuestion.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] as string[]).length > 0 && (
                                <div className="mb-2 space-x-1 inline-flex flex-wrap">
                                  {(currentQuestion.image_urls[option.label as 'A' | 'B' | 'C' | 'D' | 'E'] as string[]).map((imageUrl, imgIdx) => (
                                    <div key={imgIdx} className="group relative inline-block">
                                      <img
                                        src={imageUrl}
                                        alt={`Choice ${option.label} image ${imgIdx + 1}`}
                                        className="h-10 w-auto rounded border border-gray-300 cursor-pointer"
                                      />
                                      <img
                                        src={imageUrl}
                                        alt={`Choice ${option.label} image ${imgIdx + 1} enlarged`}
                                        className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {option.value && <span>{option.value}</span>}
                            </div>
                            {showCorrect && (
                              <CheckCircle className="text-green-500 flex-shrink-0" />
                            )}
                            {showIncorrect && (
                              <XCircle className="text-red-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            {isAnswerSubmitted && currentQuestion.explanation && (
              <Card className="mb-2 border-khan-blue bg-blue-50">
                <CardHeader className="pb-1 pt-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <CheckCircle className="text-khan-blue h-3 w-3" />
                    Explanation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 pb-2">
                  <div className="text-xs text-gray-700 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentQuestion.explanation}
                    </ReactMarkdown>
                  </div>
                  <ExplanationChat
                    questionPrompt={currentQuestion.prompt}
                    explanation={currentQuestion.explanation}
                    correctAnswer={currentQuestion.choices[currentQuestion.answerIndex]}
                    choices={currentQuestion.choices}
                  />
                </CardContent>
              </Card>
            )}

            </div>

              {/* Bottom Sticky Bar */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                  {/* Left: Brand */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-khan-green rounded flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">APMaster</span>
                  </div>

                  {/* Center: Question Palette Toggle */}
                  <button
                    onClick={() => setShowQuestionPalette(!showQuestionPalette)}
                    className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium flex items-center gap-2"
                  >
                    Question {currentQuestionIndex + 1} of {questions.length}
                    <ChevronUp className={`h-4 w-4 transition-transform ${showQuestionPalette ? "rotate-180" : ""}`} />
                  </button>

                  {/* Right: Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleBackClick}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Report Error
                    </Button>
                    <Button
                      onClick={() => {
                        if (currentQuestionIndex > 0) {
                          setCurrentQuestionIndex(currentQuestionIndex - 1);
                          setSelectedAnswer(null);
                          setIsAnswerSubmitted(false);
                        }
                      }}
                      disabled={currentQuestionIndex === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!isAnswerSubmitted && currentQuestionIndex === questions.length - 1}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              {/* Question Palette Overlay */}
              {showQuestionPalette && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowQuestionPalette(false)}>
                  <div className="bg-white w-full max-h-[70vh] overflow-y-auto rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Question Navigator</h3>
                        <button
                          onClick={() => setShowQuestionPalette(false)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                        >
                          Go to Review Page
                        </button>
                      </div>
                      
                      {/* Question Grid */}
                      <div className="grid grid-cols-10 gap-2">
                        {questions.map((_, idx) => {
                          const isAnswered = isFullLength ? userAnswers[idx] !== undefined : idx < currentQuestionIndex || (idx === currentQuestionIndex && isAnswerSubmitted);
                          const isFlagged = flaggedQuestions.has(idx);
                          const isCurrent = idx === currentQuestionIndex;

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setCurrentQuestionIndex(idx);
                                setShowQuestionPalette(false);
                                setSelectedAnswer(null);
                                setIsAnswerSubmitted(false);
                              }}
                              className={`relative h-12 rounded border-2 font-semibold text-sm flex items-center justify-center transition-all ${
                                isCurrent
                                  ? "border-blue-600 bg-blue-50 text-blue-700"
                                  : isAnswered
                                    ? "border-gray-400 bg-gray-100 text-gray-700"
                                    : "border-gray-300 bg-white text-gray-500"
                              }`}
                            >
                              {idx + 1}
                              {isFlagged && (
                                <Flag className="absolute -top-1 -right-1 h-4 w-4 text-red-600 fill-red-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}