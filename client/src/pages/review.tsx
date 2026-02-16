import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle, XCircle, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
    return choices
      .map((c, i) => ({ letter: String.fromCharCode(65 + i), text: extractChoiceText(c) }))
      .filter(({ letter, text }) => letter !== "E" || text.trim() !== "");
  }
  const keys = ["A", "B", "C", "D", "E"];
  return keys
    .filter(k => choices[k] !== undefined)
    .map(k => ({ letter: k, text: extractChoiceText(choices[k]) }))
    .filter(({ letter, text }) => letter !== "E" || text.trim() !== "");
}

export default function ReviewPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subjectId = router.query.subject as string | undefined;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

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
        ? `/api/user/questions/due?subjectId=${subjectId}&limit=50`
        : "/api/user/questions/due?limit=50";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch due reviews");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const dueQuestions = dueResponse?.data || [];
  const currentQuestion = dueQuestions[currentIndex];

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer) return;
    setIsSubmitted(true);

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

  const handleRemove = async () => {
    if (!currentQuestion) return;
    const removedQuestion = currentQuestion;
    setIsRemoving(true);
    try {
      await apiRequest("POST", "/api/user/questions/remove", {
        questionId: removedQuestion.questionId,
      });
      const newQuestions = dueQuestions.filter((_, i) => i !== currentIndex);
      queryClient.setQueryData(["dueReviews", subjectId || "all"], {
        success: true,
        data: newQuestions,
      });
      if (currentIndex >= newQuestions.length && newQuestions.length > 0) {
        setCurrentIndex(newQuestions.length - 1);
      }
      setSelectedAnswer(null);
      setIsSubmitted(false);
      toast({
        title: "Question removed from review",
        action: (
          <ToastAction
            altText="Undo remove"
            onClick={async () => {
              try {
                await apiRequest("POST", "/api/user/questions/restore", {
                  questionId: removedQuestion.questionId,
                });
                refetch();
              } catch (e) {
                console.log("Could not undo removal");
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    } catch (e) {
      console.log("Could not remove question");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < dueQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
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
            {dueQuestions.length} to review
          </Badge>
        </div>

        {dueQuestions.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">All caught up!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              No questions to review. Questions you get wrong during practice will appear here.
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
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Q{currentIndex + 1} of {dueQuestions.length}
              </span>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                title="Remove from review"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardContent className="p-6">
                <p className="text-base text-gray-900 dark:text-gray-100 mb-6 leading-relaxed font-medium">
                  {currentQuestion.prompt || `Q${currentIndex + 1}`}
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
                        if (isSubmitted) {
                          if (isCorrect) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/30";
                          else if (isSelected && !isCorrect) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/30";
                          else borderClass = "border-gray-200 dark:border-gray-700";
                        } else if (isSelected) {
                          borderClass = "border-purple-500 bg-purple-50 dark:bg-purple-900/20";
                        }

                        return (
                          <button
                            key={letter}
                            onClick={() => !isSubmitted && setSelectedAnswer(letter)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-4 rounded-lg border-2 ${borderClass} transition-all disabled:cursor-default`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`font-bold mt-0.5 ${isSubmitted && isCorrect ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                                {letter}.
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 flex-1">{text}</span>
                              {isSubmitted && isCorrect && (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              )}
                              {isSubmitted && isSelected && !isCorrect && (
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {isSubmitted && (
                  <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                    selectedAnswer === (currentQuestion.answerIndex !== undefined ? String.fromCharCode(65 + currentQuestion.answerIndex) : '')
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}>
                    {selectedAnswer === (currentQuestion.answerIndex !== undefined ? String.fromCharCode(65 + currentQuestion.answerIndex) : '')
                      ? "Correct!"
                      : `Incorrect. The correct answer is ${currentQuestion.answerIndex !== undefined ? String.fromCharCode(65 + currentQuestion.answerIndex) : '?'}.`}
                  </div>
                )}

                {isSubmitted && currentQuestion.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Explanation</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex >= dueQuestions.length - 1}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {!isSubmitted && (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Submit
                  </Button>
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
                    setIsSubmitted(false);
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
