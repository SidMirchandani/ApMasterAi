
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
  explanation: string;
}

// Map subject IDs to their API codes
const SUBJECT_API_CODES: Record<string, string> = {
  "macroeconomics": "APMACRO",
  "microeconomics": "APMICRO",
  "computer-science-principles": "APCSP",
  "calculus-ab": "APCALCAB",
  "calculus-bc": "APCALCBC",
  "biology": "APBIO",
};

// Map subject IDs to their unit-section mappings
const SUBJECT_UNIT_MAPS: Record<string, Record<string, string>> = {
  "macroeconomics": {
    unit1: "BEC",
    unit2: "EIBC",
    unit3: "NIPD",
    unit4: "FS",
    unit5: "LRCSP",
    unit6: "OEITF",
  },
  "microeconomics": {
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
  "biology": {
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

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!unit || !subjectId) {
        setError("Invalid quiz parameters");
        setIsLoading(false);
        return;
      }

      // Get the unit map for this subject
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

      try {
        const subjectApiCode = SUBJECT_API_CODES[subjectId as string];
        if (!subjectApiCode) {
          setError(`Quiz not yet available for ${subjectId}`);
          setIsLoading(false);
          return;
        }

        const response = await apiRequest(
          "GET",
          `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=25`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch questions");
        }

        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          // Shuffle and select up to 25 questions
          const shuffled = [...data.data].sort(() => Math.random() - 0.5);
          setQuestions(shuffled.slice(0, 25));
        } else {
          setError("No questions found for this unit");
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

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer: string) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;

    setIsAnswerSubmitted(true);
    if (selectedAnswer === currentQuestion.correctAnswer) {
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

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    // Reshuffle questions
    setQuestions([...questions].sort(() => Math.random() - 0.5));
  };

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

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Quiz Complete!</CardTitle>
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
              <div className="flex gap-4 justify-center">
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
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Study
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const options = [
    { label: "A", value: currentQuestion.optionA },
    { label: "B", value: currentQuestion.optionB },
    { label: "C", value: currentQuestion.optionC },
    { label: "D", value: currentQuestion.optionD },
    { label: "E", value: currentQuestion.optionE },
  ];

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/study?subject=${subjectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Study
          </Button>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h2>
            <div className="text-lg font-semibold text-khan-green">
              Score: {score}/{currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = selectedAnswer === option.label;
                const isCorrect = option.label === currentQuestion.correctAnswer;
                const showCorrect = isAnswerSubmitted && isCorrect;
                const showIncorrect = isAnswerSubmitted && isSelected && !isCorrect;

                return (
                  <button
                    key={option.label}
                    onClick={() => handleAnswerSelect(option.label)}
                    disabled={isAnswerSubmitted}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      showCorrect
                        ? "border-green-500 bg-green-50"
                        : showIncorrect
                        ? "border-red-500 bg-red-50"
                        : isSelected
                        ? "border-khan-blue bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${isAnswerSubmitted ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
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
                      <div className="flex-1 pt-1">{option.value}</div>
                      {showCorrect && <CheckCircle className="text-green-500 flex-shrink-0" />}
                      {showIncorrect && <XCircle className="text-red-500 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Explanation */}
        {isAnswerSubmitted && currentQuestion.explanation && (
          <Card className="mb-6 border-khan-blue">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="text-khan-blue" />
                Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{currentQuestion.explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {!isAnswerSubmitted ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="bg-khan-green hover:bg-khan-green/90 px-8"
            >
              Submit Answer
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="bg-khan-blue hover:bg-khan-blue/90 px-8"
            >
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Complete Quiz"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
