import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Eye, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BookmarkedQuestion {
  id: string;
  questionId: string;
  subjectId: string;
  unitId: string;
  prompt: string;
  choices: string[] | Record<string, any>;
  answerIndex: number;
  explanation: string;
  sectionCode?: string;
  createdAt?: any;
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

export default function BookmarksPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subjectId = router.query.subject as string | undefined;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: bookmarksResponse, isLoading } = useQuery<{
    success: boolean;
    data: BookmarkedQuestion[];
  }>({
    queryKey: ["bookmarks", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/bookmarks?subjectId=${subjectId}`
        : "/api/user/bookmarks";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const removeMutation = useMutation({
    mutationFn: async (question: BookmarkedQuestion) => {
      const res = await apiRequest("POST", "/api/user/bookmarks/toggle", {
        questionId: question.questionId,
        subjectId: question.subjectId,
      });
      if (!res.ok) throw new Error("Failed to remove bookmark");
      return { question };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"], exact: false });
      const removedQ = data.question;
      toast({
        title: "Bookmark removed",
        action: (
          <ToastAction
            altText="Undo remove"
            onClick={async () => {
              try {
                await apiRequest("POST", "/api/user/bookmarks/toggle", {
                  questionId: removedQ.questionId,
                  subjectId: removedQ.subjectId,
                });
                queryClient.invalidateQueries({ queryKey: ["bookmarks"], exact: false });
              } catch (e) {
                console.log("Could not undo");
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    },
  });

  const bookmarks = bookmarksResponse?.data || [];
  const currentQuestion = bookmarks[currentIndex];

  const resetState = () => {
    setSelectedAnswer(null);
    setIsRevealed(false);
    setIsSubmitted(false);
  };

  const handleNext = () => {
    if (currentIndex < bookmarks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetState();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetState();
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    setIsRevealed(true);
  };

  const handleRemove = () => {
    if (!currentQuestion) return;
    removeMutation.mutate(currentQuestion);
    if (currentIndex >= bookmarks.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    resetState();
  };

  useEffect(() => {
    if (currentIndex >= bookmarks.length && bookmarks.length > 0) {
      setCurrentIndex(bookmarks.length - 1);
    }
  }, [bookmarks.length, currentIndex]);

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

      <div className="container mx-auto px-4 py-4 max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-yellow-500 fill-current" />
            Saved Questions
          </h1>
          <Badge variant="outline" className="text-sm dark:border-gray-600 dark:text-gray-300">
            {bookmarks.length} saved
          </Badge>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-10">
            <Bookmark className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No saved questions yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Bookmark questions during practice to review them later
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
                Q{currentIndex + 1} of {bookmarks.length}
              </span>
              <div className="flex items-center gap-2">
                {currentQuestion.unitId && (
                  <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                    {currentQuestion.unitId}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardContent className="p-4">
                <p className="text-base text-gray-900 dark:text-gray-100 mb-4 leading-relaxed font-medium">
                  {typeof currentQuestion.prompt === "string" && currentQuestion.prompt
                    ? currentQuestion.prompt
                    : `Q${currentIndex + 1}`}
                </p>

                {(() => {
                  const choicesArr = getChoicesArray(currentQuestion.choices);
                  const correctLetter = String.fromCharCode(65 + currentQuestion.answerIndex);

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
                          borderClass = "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
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
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              )}
                              {isRevealed && isSelected && !isCorrect && (
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {isRevealed && currentQuestion.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Explanation</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                )}

                {isSubmitted && (
                  <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                    selectedAnswer === String.fromCharCode(65 + currentQuestion.answerIndex)
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}>
                    {selectedAnswer === String.fromCharCode(65 + currentQuestion.answerIndex)
                      ? "Correct!"
                      : `Incorrect. The correct answer is ${String.fromCharCode(65 + currentQuestion.answerIndex)}.`}
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
                  disabled={currentIndex >= bookmarks.length - 1}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {!isRevealed && (
                  <Button
                    variant="outline"
                    onClick={handleReveal}
                    className="border-blue-400 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Reveal Answer
                  </Button>
                )}
                {!isRevealed && (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer}
                    className="bg-khan-green hover:bg-khan-green-light text-white"
                  >
                    Submit
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-1 pt-2">
              {bookmarks.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    resetState();
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex
                      ? "bg-yellow-500"
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
