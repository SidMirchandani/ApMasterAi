import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Flag } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getSubjectByLegacyId, getSubjectByCode, getUnitDisplayLabel } from "@/subjects";
import { getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import { ExplanationPanel } from "@/components/quiz/ExplanationPanel";
import { ReportQuestionDialog } from "@/components/quiz/ReportQuestionDialog";

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
  const unit = router.query.unit as string | undefined;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: bookmarksResponse, isLoading } = useQuery<{
    success: boolean;
    data: BookmarkedQuestion[];
  }>({
    queryKey: ["bookmarks", subjectId || "all", unit || ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subjectId) params.set("subjectId", subjectId);
      if (unit) params.set("unitId", unit);
      const url = `/api/user/bookmarks?${params.toString()}`;
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
      // Invalidate both general bookmarks and subject-specific bookmarks
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      
      const removedQ = data.question;
      toast({
        title: "Bookmark removed",
        action: (
          <ToastAction
            altText="Undo remove"
            onClick={async () => {
              try {
                const res = await apiRequest("POST", "/api/user/bookmarks/toggle", {
                  questionId: removedQ.questionId,
                  subjectId: removedQ.subjectId,
                  unitId: removedQ.unitId || "",
                  prompt: removedQ.prompt || "",
                  choices: removedQ.choices || [],
                  answerIndex: removedQ.answerIndex ?? 0,
                  explanation: removedQ.explanation || "",
                  sectionCode: removedQ.sectionCode || "",
                });
                
                if (!res.ok) throw new Error("Failed to restore");
                
                await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
                toast({ title: "Bookmark restored" });
              } catch (e) {
                console.error("Could not undo", e);
                toast({ title: "Failed to restore bookmark", variant: "destructive" });
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

      <div className="container mx-auto px-3 py-2 max-w-6xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
              onClick={() => router.push(subjectId ? `/study?subject=${subjectId}` : "/dashboard")}
              className="bg-khan-green hover:bg-khan-green-light text-white"
            >
              Start Practicing
            </Button>
          </div>
        ) : currentQuestion ? (
          <>
          <div className="space-y-2 pb-14">
            {subjectId && currentQuestion.unitId && (
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {getUnitDisplayLabel(subjectId, currentQuestion.unitId)}
              </p>
            )}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-stretch">
              {/* Question: left on desktop, top on narrow screens */}
              <div className="order-1 flex-1 min-w-0">
                <Card className="dark:bg-gray-900 dark:border-gray-700 h-full">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-900 dark:text-gray-100 mb-3 leading-relaxed font-medium">
                      {typeof currentQuestion.prompt === "string" && currentQuestion.prompt
                        ? currentQuestion.prompt
                        : `Q${currentIndex + 1}`}
                    </p>

                    {(() => {
                      const choicesArr = getChoicesArray(currentQuestion.choices);
                      const subject = currentQuestion.subjectId ? getSubjectByLegacyId(currentQuestion.subjectId) || getSubjectByCode(currentQuestion.subjectId) : undefined;
                      const correctLetter = getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex }, subject?.metadata?.mcqOptionCount);

                      return (
                        <div className="space-y-2">
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
                                className={`w-full text-left p-3 rounded-lg border-2 ${borderClass} transition-all disabled:cursor-default text-xs`}
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
                  </CardContent>
                </Card>
              </div>
              {/* Explanation: right on desktop, below on narrow screens */}
              <div className="order-2 w-full md:w-[35%] md:min-w-0 flex flex-col">
                {(() => {
                  const subject = currentQuestion.subjectId ? getSubjectByLegacyId(currentQuestion.subjectId) || getSubjectByCode(currentQuestion.subjectId) : undefined;
                  const displayCorrect = getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex }, subject?.metadata?.mcqOptionCount);
                  return (
                    <ExplanationPanel
                      hasAnswered={isRevealed}
                      isCorrect={!isSubmitted ? true : selectedAnswer === displayCorrect}
                    >
                      {isRevealed && (
                        <>
                          {selectedAnswer === displayCorrect ? "Correct!" : `Incorrect. The correct answer is ${displayCorrect}.`}
                          {currentQuestion.explanation && (
                            <div className="mt-2">
                              <PrettyExplanation>
                                {getDisplayExplanation(currentQuestion.explanation, currentQuestion, subject?.metadata?.mcqOptionCount)}
                              </PrettyExplanation>
                            </div>
                          )}
                        </>
                      )}
                    </ExplanationPanel>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Fixed bottom bar — identical to review questions */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 fixed bottom-0 left-0 right-0 z-50">
            <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2.5">
              <div className="flex justify-between items-center gap-2 sm:gap-4">
                <div className="flex flex-1 items-center min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 disabled:opacity-30 rounded-xl shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                </div>
                <div className="flex justify-center items-center flex-shrink-0">
                  {!isRevealed ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!selectedAnswer}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl disabled:opacity-50"
                    >
                      Submit
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={currentIndex >= bookmarks.length - 1}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl flex items-center gap-2 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex justify-end flex-1 items-center gap-2 min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReportDialog(true)}
                    className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                  >
                    <Flag className="w-3.5 h-3.5 mr-1" />
                    Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemove}
                    disabled={removeMutation.isPending}
                    className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(subjectId ? `/study?subject=${subjectId}` : "/dashboard")}
                    className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-xs"
                  >
                    {bookmarks.length > 0 ? "Save & Exit" : "Exit"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <ReportQuestionDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            questionId={currentQuestion?.questionId}
            subjectId={currentQuestion?.subjectId || subjectId || ""}
          />
          </>
        ) : null}
      </div>
    </div>
  );
}
