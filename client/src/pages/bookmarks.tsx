import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Lightbulb, Eye, ChevronLeft, ChevronRight } from "lucide-react";
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
    return choices.map((c, i) => ({ letter: String.fromCharCode(65 + i), text: extractChoiceText(c) }));
  }
  const keys = ["A", "B", "C", "D", "E"];
  return keys
    .filter(k => choices[k] !== undefined)
    .map(k => ({ letter: k, text: extractChoiceText(choices[k]) }));
}

export default function BookmarksPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"], exact: false });
      toast({ title: "Bookmark removed" });
    },
  });

  const bookmarks = bookmarksResponse?.data || [];
  const currentQuestion = bookmarks[currentIndex];

  const handleNext = () => {
    if (currentIndex < bookmarks.length - 1) {
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

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleRemove = () => {
    if (!currentQuestion) return;
    removeMutation.mutate(currentQuestion);
    if (currentIndex >= bookmarks.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setSelectedAnswer(null);
    setShowHint(false);
    setIsRevealed(false);
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

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-yellow-500 fill-current" />
            Saved Questions
          </h1>
          <Badge variant="outline" className="text-sm dark:border-gray-600 dark:text-gray-300">
            {bookmarks.length} saved
          </Badge>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No saved questions yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
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
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Question {currentIndex + 1} of {bookmarks.length}
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
              <CardContent className="p-6">
                <p className="text-base text-gray-900 dark:text-gray-100 mb-6 leading-relaxed font-medium">
                  {typeof currentQuestion.prompt === "string" && currentQuestion.prompt
                    ? currentQuestion.prompt
                    : `Saved question ${currentIndex + 1}`}
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

                {showHint && !isRevealed && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Hint
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      The correct answer is option {String.fromCharCode(65 + currentQuestion.answerIndex)}.
                      {currentQuestion.explanation && " Try to think about why before revealing the full explanation."}
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
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                      onClick={handleNext}
                      disabled={currentIndex >= bookmarks.length - 1}
                      className="bg-khan-green hover:bg-khan-green-light text-white"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-1 pt-2">
              {bookmarks.map((_, idx) => (
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
