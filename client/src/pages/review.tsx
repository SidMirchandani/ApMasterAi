import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle, XCircle, ChevronRight, ChevronLeft, Lightbulb, Eye } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface DueQuestion {
  questionId: string;
  subjectId: string;
  unitId: string;
  sectionCode?: string;
  correctStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  nextReviewAt: string;
  prompt?: string;
  choices?: string[] | Record<string, any>;
  answerIndex?: number;
  explanation?: string;
}

function extractChoiceText(choice: any): string {
  if (typeof choice === "string") return choice;
  if (Array.isArray(choice)) {
    return choice
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.value)
      .join(" ");
  }
  return String(choice);
}

function getChoicesArray(choices: string[] | Record<string, any>): { letter: string; text: string }[] {
  if (Array.isArray(choices)) {
    return choices.map((c, i) => ({ letter: String.fromCharCode(65 + i), text: extractChoiceText(c) }));
  }
  const keys = ["A", "B", "C", "D", "E"];
  return keys
    .filter(k => choices[k] !== undefined)
    .map(k => ({ letter: k, text: extractChoiceText(choices[k]) }));
}

export default function ReviewPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = router.query.subject as string | undefined;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: dueResponse, isLoading, refetch } = useQuery<{
    success: boolean;
    data: DueQuestion[];
  }>({
    queryKey: ["dueReviews", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/questions/due?subjectId=${subjectId}&limit=20`
        : "/api/user/questions/due?limit=20";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch due reviews");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const dueQuestions = dueResponse?.data || [];
  const currentQuestion = dueQuestions[currentIndex];

  const handleReveal = async () => {
    if (!currentQuestion) return;
    setIsRevealed(true);

    const correctLetter = currentQuestion.answerIndex !== undefined
      ? String.fromCharCode(65 + currentQuestion.answerIndex)
      : null;
    const isCorrect = selectedAnswer === correctLetter;

    try {
      await apiRequest("POST", "/api/user/questions/track", {
        questionId: currentQuestion.questionId,
        subjectId: currentQuestion.subjectId,
        unitId: currentQuestion.unitId || '',
        correct: isCorrect,
        timeSpentSec: 0,
        sectionCode: currentQuestion.sectionCode || '',
      });
    } catch (e) {
      console.log("Could not track review");
    }
  };

  const handleNext = () => {
    if (currentIndex < dueQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setIsRevealed(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setIsRevealed(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-500" />
            Review Questions
          </h1>
          <Badge variant="outline" className="text-sm dark:border-gray-600 dark:text-gray-300">
            {dueQuestions.length} due
          </Badge>
        </div>

        {dueQuestions.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">All caught up!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              No questions are due for review right now. Keep practicing to build your review queue.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-khan-green hover:bg-khan-green-light text-white"
            >
              Start Practicing
            </Button>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Question {currentIndex + 1} of {dueQuestions.length}
              </span>
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Streak: {currentQuestion.correctStreak} | Attempts: {currentQuestion.totalAttempts}
              </Badge>
            </div>

            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardContent className="p-6">
                <p className="text-base text-gray-900 dark:text-gray-100 mb-6 leading-relaxed font-medium">
                  {currentQuestion.prompt || `Review question ${currentIndex + 1}`}
                </p>

                {currentQuestion.choices && (() => {
                  const choicesArr = getChoicesArray(currentQuestion.choices);
                  const correctLetter = currentQuestion.answerIndex !== undefined
                    ? String.fromCharCode(65 + currentQuestion.answerIndex)
                    : null;

                  return (
                    <div className="space-y-3">
                      {choicesArr.map(({ letter, text }) => {
                        const isSelected = selectedAnswer === letter;
                        const isCorrect = letter === correctLetter;

                        let borderClass = "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500";
                        if (isRevealed) {
                          if (isCorrect) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/30";
                          else if (isSelected && !isCorrect) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/30";
                          else borderClass = "border-gray-200 dark:border-gray-700";
                        } else if (isSelected) {
                          borderClass = "border-purple-500 bg-purple-50 dark:bg-purple-900/20";
                        }

                        return (
                          <button
                            key={letter}
                            onClick={() => !isRevealed && setSelectedAnswer(letter)}
                            disabled={isRevealed}
                            className={`w-full text-left p-4 rounded-lg border-2 ${borderClass} transition-all disabled:cursor-default`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`font-bold mt-0.5 ${isRevealed && isCorrect ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                                {letter}.
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 flex-1">{text}</span>
                              {isRevealed && isCorrect && (
                                <span className="text-green-500 text-sm font-semibold flex-shrink-0">Correct</span>
                              )}
                              {isRevealed && isSelected && !isCorrect && (
                                <span className="text-red-500 text-sm font-semibold flex-shrink-0">Your answer</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {showHint && !isRevealed && currentQuestion.answerIndex !== undefined && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Hint
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      The correct answer is option {String.fromCharCode(65 + currentQuestion.answerIndex)}.
                      {currentQuestion.explanation && " Try to reason through it before revealing the explanation."}
                    </p>
                  </div>
                )}

                {isRevealed && currentQuestion.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Explanation</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {!isRevealed && (
                  <Button
                    variant="outline"
                    onClick={() => setShowHint(!showHint)}
                    className="border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <Lightbulb className="w-4 h-4 mr-1" />
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isRevealed ? (
                  <Button
                    onClick={handleReveal}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Reveal Answer
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="dark:border-gray-600 dark:text-gray-300"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button
                      onClick={currentIndex < dueQuestions.length - 1 ? handleNext : () => {
                        refetch();
                        setCurrentIndex(0);
                        setSelectedAnswer(null);
                        setShowHint(false);
                        setIsRevealed(false);
                      }}
                      className="bg-khan-green hover:bg-khan-green-light text-white"
                    >
                      {currentIndex < dueQuestions.length - 1 ? (
                        <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                      ) : (
                        "Finish Review"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-1 pt-2">
              {dueQuestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setSelectedAnswer(null);
                    setShowHint(false);
                    setIsRevealed(false);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex
                      ? "bg-purple-500"
                      : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
