import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ArrowRight,
  MoreVertical,
  Highlighter,
  FileText,
  Calculator,
  BookOpen,
  HelpCircle,
  Printer,
  LogOut,
  Flag,
  ChevronUp,
} from "lucide-react";
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
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

const SUBJECT_API_CODES: Record<string, string> = {
  macroeconomics: "APMACRO",
  microeconomics: "APMICRO",
  "computer-science-principles": "APCSP",
  "calculus-ab": "APCALCAB",
  "calculus-bc": "APCALCBC",
  biology: "APBIO",
};

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

  // Exit test
  const handleExitTest = () => setShowExitDialog(true);
  const handleSubmit = () => setShowSubmitConfirm(true);

  // Timer
  useEffect(() => {
    if (quizCompleted || isReviewMode) return;
    const timer = setInterval(() => setTimeElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [quizCompleted, isReviewMode]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

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

  const handleBackClick = () => {
    if (!quizCompleted && questions.length > 0 && !isReviewMode) {
      setShowExitDialog(true);
    } else router.push(`/study?subject=${subjectId}`);
  };

  const confirmExit = () => router.push(`/study?subject=${subjectId}`);

  // FETCH QUESTIONS
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

        const isFullLength = unit === "full-length";

        if (isFullLength) {
          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&limit=50`,
          );
          if (!response.ok) throw new Error("Failed to fetch questions");
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            setQuestions(data.data);
          } else setError("No questions found for this subject");
        } else {
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
          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=25`,
          );
          if (!response.ok) throw new Error("Failed to fetch");
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const shuffled = [...data.data].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, 25));
          } else setError("No questions found");
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
  const questionsPerPage = isFullLength ? 5 : 1;
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
    if (isReviewMode) return;
    if (isFullLength && questionIndex !== undefined) {
      const globalIndex = currentPage * questionsPerPage + questionIndex;
      setUserAnswers((prev) => ({ ...prev, [globalIndex]: answer }));
    } else if (!isAnswerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const toggleFlag = (questionIndex: number) => {
    setFlaggedQuestions((prev) => {
      const ns = new Set(prev);
      if (ns.has(questionIndex)) ns.delete(questionIndex);
      else ns.add(questionIndex);
      return ns;
    });
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    setIsAnswerSubmitted(true);
    const correctLabel = String.fromCharCode(65 + currentQuestion.answerIndex);
    if (selectedAnswer === correctLabel) setScore(score + 1);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else setQuizCompleted(true);
  };

  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage((p) => p + 1);

  const handlePreviousPage = () =>
    currentPage > 0 && setCurrentPage((p) => p - 1);

  const confirmSubmitFullLength = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = userAnswers[i];
      const correctAns = String.fromCharCode(65 + q.answerIndex);
      if (userAns === correctAns) correct++;
    });
    setScore(correct);
    setQuizCompleted(true);
    setShowSubmitConfirm(false);
  };

  const handleReviewUnit = (sectionCode: string) => {
    const unitQuestions = questions.filter(
      (q) => q.section_code === sectionCode,
    );
    const unitAnswers: { [key: number]: string } = {};
    questions.forEach((q, idx) => {
      if (q.section_code === sectionCode) unitAnswers[idx] = userAnswers[idx];
    });

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
    setIsReviewMode(false);
    setUserAnswers({});
    setCurrentPage(0);
    setQuestions((q) => [...q].sort(() => Math.random() - 0.5));
  };

  // Save score
  useEffect(() => {
    const saveScore = async () => {
      if (!quizCompleted || !subjectId || !unit) return;
      const pct = Math.round((score / questions.length) * 100);
      try {
        if (isFullLength) {
          await apiRequest(
            "POST",
            `/api/user/subjects/${subjectId}/full-length-test`,
            {
              score,
              percentage: pct,
              totalQuestions: questions.length,
              questions,
              userAnswers,
            },
          );
        } else {
          await apiRequest(
            "PUT",
            `/api/user/subjects/${subjectId}/unit-progress`,
            { unitId: unit, mcqScore: pct },
          );
        }
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

  // QUIZ COMPLETION (not review)
  if (quizCompleted && !isReviewMode) {
    const percentage = Math.round((score / questions.length) * 100);

    const sectionPerformance = isFullLength
      ? (() => {
          const map: Record<
            string,
            { name: string; correct: number; total: number; percentage: number }
          > = {};

          const sectionNames: Record<string, string> = {
            BEC: "Basic Economic Concepts",
            EIBC: "Economic Indicators & Business Cycle",
            NIPD: "National Income & Price Determination",
            FS: "Financial Sector",
            LRCSP: "Long-Run Consequences of Stabilization Policies",
            OEITF: "Open Economy - International Trade & Finance",
          };

          questions.forEach((q, i) => {
            const code = q.section_code || "Unknown";
            const label = sectionNames[code] || code;
            if (!map[code])
              map[code] = { name: label, correct: 0, total: 0, percentage: 0 };
            map[code].total++;
            const userAns = userAnswers[i];
            const correctAns = String.fromCharCode(65 + q.answerIndex);
            if (userAns === correctAns) map[code].correct++;
          });

          Object.values(map).forEach((s) => {
            s.percentage = Math.round((s.correct / s.total) * 100);
          });

          return map;
        })()
      : null;

    const getPerformanceLevel = (pct: number) => {
      if (pct >= 90)
        return {
          label: "Excellent",
          color: "text-green-600",
          bg: "bg-green-100",
        };
      if (pct >= 75)
        return { label: "Good", color: "text-blue-600", bg: "bg-blue-100" };
      if (pct >= 60)
        return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" };
      return { label: "Needs Work", color: "text-red-600", bg: "bg-red-100" };
    };

    const overall = getPerformanceLevel(percentage);

    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-4">
          {isFullLength ? (
            <div className="max-w-6xl mx-auto space-y-3">
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
                        className={`inline-block px-6 py-2 rounded-full ${overall.bg} ${overall.color} font-semibold`}
                      >
                        {overall.label}
                      </div>
                      <p className="text-sm text-gray-600">
                        {score} out of {questions.length} questions correct
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <CheckCircle className="h-12 w-12 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold">{score}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Correct Answers
                        </p>
                      </div>

                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <XCircle className="h-12 w-12 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold">
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
                        <p className="text-3xl font-bold">Total</p>
                        <p className="text-sm text-gray-600 mt-1">Questions</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Section Performance */}
              <Card className="border-t-4 border-t-khan-blue">
                <CardHeader>
                  <CardTitle>Performance by Unit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectionPerformance &&
                      Object.entries(sectionPerformance).map(([code, sec]) => (
                        <div
                          key={code}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">{sec.name}</h3>
                            <span className="font-bold text-gray-700">
                              {sec.percentage}%
                            </span>
                          </div>
                          <Progress value={sec.percentage} />
                          <div className="flex justify-between mt-2 text-sm text-gray-600">
                            <span>{sec.correct} correct</span>
                            <span>{sec.total} total</span>
                          </div>
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() =>
                                handleReviewUnit(
                                  questions.find((q) => q.section_code === code)
                                    ?.section_code || code,
                                )
                              }
                            >
                              Review This Unit
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              {/* Next actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsReviewMode(true)}>
                  Review Answers
                </Button>
                <Button onClick={handleRetakeQuiz}>Retake Test</Button>
              </div>
            </div>
          ) : (
            // ===== UNIT QUIZ RESULT =====
            <div className="max-w-3xl mx-auto space-y-6">
              <Card className="border-t-4 border-t-khan-green">
                <CardHeader>
                  <CardTitle>Quiz Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      {percentage >= 70 ? (
                        <CheckCircle className="h-16 w-16 text-green-500" />
                      ) : (
                        <XCircle className="h-16 w-16 text-red-500" />
                      )}
                    </div>
                    <p className="text-4xl font-bold">{percentage}%</p>
                    <p className="text-gray-600 mt-2">
                      {score} out of {questions.length} correct
                    </p>
                  </div>

                  <div className="flex justify-center gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsReviewMode(true)}
                    >
                      Review Answers
                    </Button>
                    <Button onClick={handleRetakeQuiz}>Retake Quiz</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== REVIEW MODE =====
  if (isReviewMode) {
    const reviewQuestions = isFullLength ? questions : questions;
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center mb-4 justify-between">
            <h2 className="text-2xl font-bold">Review Answers</h2>
            <Button variant="outline" onClick={() => setIsReviewMode(false)}>
              Exit Review
            </Button>
          </div>

          <div className="space-y-6">
            {reviewQuestions.map((q, index) => {
              const userAns = userAnswers[index];
              const correctAns = String.fromCharCode(65 + q.answerIndex);
              const isCorrect = userAns === correctAns;

              return (
                <Card key={index} className="border border-gray-300">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>
                        Question {index + 1}
                        <span
                          className={`ml-3 px-2 py-1 rounded text-sm ${
                            isCorrect
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-gray-800 font-medium">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {q.prompt}
                      </ReactMarkdown>
                    </div>

                    {/* Question images */}
                    {q.image_urls?.question?.length ? (
                      <div className="space-y-2">
                        {q.image_urls.question.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            className="rounded border max-w-full"
                          />
                        ))}
                      </div>
                    ) : null}

                    {/* Choices */}
                    <div className="space-y-3">
                      {q.choices.map((choice, i) => {
                        const label = String.fromCharCode(65 + i);
                        const selected = userAns === label;
                        const correct = correctAns === label;

                        return (
                          <div
                            key={label}
                            className={`border rounded p-3 ${
                              correct
                                ? "border-green-500 bg-green-50"
                                : selected
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-300 bg-white"
                            }`}
                          >
                            <p className="font-semibold text-gray-900">
                              {label}.
                            </p>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {choice}
                            </ReactMarkdown>

                            {/* Choice-specific images */}
                            {q.image_urls?.[label]?.length ? (
                              <div className="mt-2 space-y-2">
                                {q.image_urls[label]?.map((img, ii) => (
                                  <img
                                    key={ii}
                                    src={img}
                                    className="rounded border max-w-full"
                                  />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-700">
                        Explanation
                      </h4>
                      <ExplanationChat explanation={q.explanation} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== LIVE QUIZ MODE UI (Not completed, not review) ==========
  const renderChoice = (
    choice: string,
    i: number,
    globalIndex: number,
    isFull: boolean,
  ) => {
    const label = String.fromCharCode(65 + i);
    const userAns = userAnswers[globalIndex];
    const isSelected = isFull ? userAns === label : selectedAnswer === label;

    return (
      <button
        key={label}
        onClick={() =>
          isFull ? handleAnswerSelect(label, i) : handleAnswerSelect(label)
        }
        className={`w-full text-left p-3 rounded border transition ${
          isReviewMode
            ? ""
            : isSelected
              ? "border-khan-blue bg-blue-50"
              : "border-gray-300 bg-white hover:bg-gray-50"
        }`}
      >
        <span className="font-bold mr-2">{label}.</span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{choice}</ReactMarkdown>

        {/* Choice-specific images */}
        {currentQuestion.image_urls?.[label]?.length ? (
          <div className="mt-2 space-y-2">
            {currentQuestion.image_urls[label]?.map((img, ii) => (
              <img key={ii} src={img} className="rounded border max-w-full" />
            ))}
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <div className="text-gray-600 text-sm">
            Time: {formatTime(timeElapsed)}
          </div>

          <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <DropdownMenuTrigger>
              <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right">
              <DropdownMenuItem onClick={() => setShowQuestionPalette(true)}>
                Question Palette
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExitTest}>
                Exit Test
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Progress value={progress} className="mb-6" />
        {/* FULL-LENGTH MODE — SHOW 5 QUESTIONS */}
        {isFullLength ? (
          <div className="space-y-8">
            {currentQuestions.map((q, idx) => {
              const globalIndex = currentPage * questionsPerPage + idx;
              const userAnswer = userAnswers[globalIndex];
              const flagged = flaggedQuestions.has(globalIndex);

              return (
                <Card key={globalIndex} className="border border-gray-300">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Question {globalIndex + 1}</span>

                      <button
                        className={`p-2 rounded border ${
                          flagged
                            ? "border-red-400 text-red-500"
                            : "border-gray-300 text-gray-500"
                        }`}
                        onClick={() => toggleFlag(globalIndex)}
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* PROMPT */}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {q.prompt}
                    </ReactMarkdown>

                    {/* PROMPT IMAGES */}
                    {q.image_urls?.question?.length ? (
                      <div className="space-y-2">
                        {q.image_urls.question.map((img, ii) => (
                          <img
                            key={ii}
                            src={img}
                            className="rounded border max-w-full"
                          />
                        ))}
                      </div>
                    ) : null}

                    {/* CHOICES */}
                    <div className="space-y-3">
                      {q.choices.map((c, i) =>
                        renderChoice(c, i, globalIndex, true),
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // UNIT MODE — SINGLE QUESTION
          <Card className="border border-gray-300">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Question {currentQuestionIndex + 1}</span>

                <button
                  className={`p-2 rounded border ${
                    flaggedQuestions.has(currentQuestionIndex)
                      ? "border-red-400 text-red-500"
                      : "border-gray-300 text-gray-500"
                  }`}
                  onClick={() => toggleFlag(currentQuestionIndex)}
                >
                  <Flag className="h-4 w-4" />
                </button>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentQuestion.prompt}
              </ReactMarkdown>

              {/* UNIT QUESTION IMAGES */}
              {currentQuestion.image_urls?.question?.length ? (
                <div className="space-y-2">
                  {currentQuestion.image_urls.question.map((img, ii) => (
                    <img
                      key={ii}
                      src={img}
                      className="rounded border max-w-full"
                    />
                  ))}
                </div>
              ) : null}

              {/* UNIT CHOICES */}
              <div className="space-y-3">
                {currentQuestion.choices.map((c, i) =>
                  renderChoice(c, i, currentQuestionIndex, false),
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* NAVIGATION BUTTONS */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            disabled={
              isFullLength ? currentPage === 0 : currentQuestionIndex === 0
            }
            onClick={() =>
              isFullLength
                ? handlePreviousPage()
                : setCurrentQuestionIndex((i) => i - 1)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          {isFullLength ? (
            currentPage === totalPages - 1 ? (
              <Button onClick={handleSubmit}>Submit Test</Button>
            ) : (
              <Button onClick={handleNextPage}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )
          ) : currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmitAnswer}>Submit</Button>
          ) : (
            <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* QUESTION PALETTE MODAL */}
      {showQuestionPalette && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-xl md:rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Question Palette</h3>
              <button onClick={() => setShowQuestionPalette(false)}>
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
              {questions.map((_, i) => {
                const isDone = !!userAnswers[i];
                const flagged = flaggedQuestions.has(i);

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (isFullLength) {
                        setCurrentPage(Math.floor(i / 5));
                      } else {
                        setCurrentQuestionIndex(i);
                      }
                      setShowQuestionPalette(false);
                    }}
                    className={`p-3 rounded border text-center text-sm ${
                      flagged
                        ? "border-red-400 bg-red-50"
                        : isDone
                          ? "border-green-400 bg-green-50"
                          : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-right">
              <Button onClick={() => setShowQuestionPalette(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EXIT CONFIRMATION */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SUBMIT CONFIRMATION (FULL LENGTH) */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You cannot change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmitFullLength}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
