import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle, ChevronRight, ChevronLeft, Flag, Trash2 } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import Navigation from "@/components/ui/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getSubjectByLegacyId, getSubjectByCode, getUnitDisplayLabel } from "@/subjects";
import { getDisplayCorrectLabel, getDisplayExplanation } from "@/lib/mcqDisplay";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import { ExplanationPanel } from "@/components/quiz/ExplanationPanel";
import { PracticeQuizQuestionCard } from "@/components/quiz/PracticeQuizQuestionCard";
import { ReportQuestionDialog } from "@/components/quiz/ReportQuestionDialog";
import { normalizeQuestion } from "@/lib/normalizeQuestion";

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
  prompt_blocks?: any[];
  choices?: string[] | Record<string, any>;
  answerIndex?: number;
  explanation?: string;
  difficulty?: string;
  tags?: string[];
}

type ReviewSource = "due" | "bookmark" | "both";

interface ReviewQuestion extends DueQuestion {
  _source: ReviewSource;
}

interface BookmarkedItem {
  questionId?: string;
  id?: string;
  subjectId: string;
  unitId: string;
  sectionCode?: string;
  prompt?: string;
  prompt_blocks?: any[];
  choices?: string[] | Record<string, any>;
  answerIndex?: number;
  explanation?: string;
}

export default function ReviewPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subjectId = router.query.subject as string | undefined;
  const unit = router.query.unit as string | undefined;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cheatMode, setCheatMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adminCheatMode");
    setCheatMode(saved === "true");
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: dueResponse, isLoading: dueLoading, refetch: refetchDue } = useQuery<{
    success: boolean;
    data: DueQuestion[];
  }>({
    queryKey: ["dueReviews", subjectId || "all", unit || ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subjectId) params.set("subjectId", subjectId);
      if (unit) params.set("unitId", unit);
      params.set("limit", "50");
      const url = `/api/user/questions/due?${params.toString()}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch due reviews");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: bookmarksResponse, isLoading: bookmarksLoading, refetch: refetchBookmarks } = useQuery<{
    success: boolean;
    data: BookmarkedItem[];
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

  const dueList = dueResponse?.data || [];
  const bookmarksList = bookmarksResponse?.data || [];

  const reviewQuestions = useMemo((): ReviewQuestion[] => {
    const dueIds = new Set(dueList.map((d) => d.questionId));
    const bookmarkIds = new Set(
      bookmarksList.map((b) => b.questionId || (b as any).id || "")
    );
    const dueWithSource: ReviewQuestion[] = dueList.map((d) => ({
      ...d,
      _source: bookmarkIds.has(d.questionId) ? "both" : "due",
    }));
    const bookmarkOnly = bookmarksList.filter(
      (b) => !dueIds.has(b.questionId || (b as any).id || "")
    );
    const mapped: ReviewQuestion[] = bookmarkOnly.map((b) => {
      const qId = b.questionId || (b as any).id || "";
      return {
        questionId: qId,
        subjectId: b.subjectId,
        unitId: b.unitId || "",
        sectionCode: b.sectionCode,
        correctStreak: 0,
        totalAttempts: 0,
        totalCorrect: 0,
        nextReviewAt: "",
        prompt: b.prompt,
        prompt_blocks: (b as any).prompt_blocks,
        choices: b.choices,
        answerIndex: b.answerIndex,
        explanation: b.explanation,
        _source: "bookmark" as const,
      };
    });
    return [...dueWithSource, ...mapped];
  }, [dueList, bookmarksList]);

  const isLoading = dueLoading || bookmarksLoading;
  const refetch = () => {
    refetchDue();
    refetchBookmarks();
  };

  useEffect(() => {
    if (reviewQuestions.length > 0 && currentIndex >= reviewQuestions.length) {
      setCurrentIndex(Math.max(0, reviewQuestions.length - 1));
    }
  }, [reviewQuestions.length, currentIndex]);

  const currentQuestion = reviewQuestions[currentIndex];
  const subject = currentQuestion?.subjectId
    ? getSubjectByLegacyId(currentQuestion.subjectId) || getSubjectByCode(currentQuestion.subjectId)
    : getSubjectByLegacyId(subjectId || "") || getSubjectByCode(subjectId || "");
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const normalizedQuestion = currentQuestion
    ? normalizeQuestion({ ...currentQuestion, id: currentQuestion.questionId })
    : null;

  const handleAnswerSelect = (answer: string) => {
    if (!isSubmitted) setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer) return;
    setIsSubmitted(true);

    const correctLetter =
      currentQuestion.answerIndex !== undefined
        ? getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex }, mcqOptionCount)
        : null;
    const isCorrect = selectedAnswer === correctLetter;

    try {
      await apiRequest("POST", "/api/user/questions/track", {
        questionId: currentQuestion.questionId,
        subjectId: currentQuestion.subjectId,
        unitId: currentQuestion.unitId || "",
        correct: isCorrect,
        timeSpentSec: 0,
        sectionCode: currentQuestion.sectionCode || "",
      });
    } catch (e) {
      console.log("Could not track review");
    }
  };

  const handleNext = () => {
    if (!currentQuestion || !selectedAnswer) return;
    const correctLetter =
      currentQuestion.answerIndex !== undefined
        ? getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex }, mcqOptionCount)
        : null;
    const wasCorrect = isSubmitted && selectedAnswer === correctLetter;

    if (wasCorrect) {
      const newIndex = reviewQuestions.length <= 1 ? 0 : Math.min(currentIndex, reviewQuestions.length - 2);
      setCurrentIndex(newIndex);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      refetch();
    } else {
      if (currentIndex < reviewQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setIsSubmitted(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < reviewQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
  };

  const handleRemove = async () => {
    if (!currentQuestion) return;
    const removedQuestion = currentQuestion as ReviewQuestion;
    const source = removedQuestion._source;
    setIsRemoving(true);
    try {
      if (source === "due" || source === "both") {
        await apiRequest("POST", "/api/user/questions/remove", {
          questionId: removedQuestion.questionId,
        });
      }
      if (source === "bookmark" || source === "both") {
        await apiRequest("POST", "/api/user/bookmarks/toggle", {
          questionId: removedQuestion.questionId,
          subjectId: removedQuestion.subjectId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["dueReviews"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      await refetch();
      if (currentIndex >= reviewQuestions.length - 1 && reviewQuestions.length > 1) {
        setCurrentIndex(reviewQuestions.length - 2);
      }
      setSelectedAnswer(null);
      setIsSubmitted(false);
      const hasDue = source === "due" || source === "both";
      toast({
        title: "Question removed from review",
        ...(hasDue && {
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
        }),
      });
    } catch (e) {
      console.log("Could not remove question");
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col text-slate-900 dark:text-slate-100">
      <Navigation />

      {reviewQuestions.length === 0 ? (
        <div className="flex-1 container mx-auto px-3 py-4 max-w-6xl">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-purple-500" />
              Review Questions
            </h1>
          </div>
          <div className="text-center py-10">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">All caught up!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No questions to review. Questions you get wrong or bookmark during practice will appear here.
            </p>
            <Button
              onClick={() => router.push(subjectId ? `/study?subject=${subjectId}` : "/dashboard")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {subjectId ? "Back to study" : "Start Practicing"}
            </Button>
          </div>
        </div>
      ) : currentQuestion && normalizedQuestion ? (
        <>
          <div className="flex-1 overflow-y-auto pb-14">
            <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-purple-500" />
                  Review Questions
                </h1>
                <Badge variant="outline" className="text-[11px] dark:border-slate-600 dark:text-slate-300">
                  {reviewQuestions.length} to review
                </Badge>
              </div>
              {subjectId && currentQuestion.unitId && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {getUnitDisplayLabel(subjectId, currentQuestion.unitId)}
                </p>
              )}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-stretch">
                <div className="order-1 flex-1 min-w-0">
                  <PracticeQuizQuestionCard
                    question={normalizedQuestion}
                    questionNumber={currentIndex + 1}
                    totalQuestions={reviewQuestions.length}
                    selectedAnswer={selectedAnswer}
                    onAnswerSelect={handleAnswerSelect}
                    isAnswerSubmitted={isSubmitted}
                    cheatMode={cheatMode}
                    mcqOptionCount={mcqOptionCount}
                  />
                </div>
                <div className="order-2 w-full md:w-[35%] md:min-w-0 flex flex-col">
                  <ExplanationPanel
                    hasAnswered={isSubmitted}
                    isCorrect={
                      !!(
                        currentQuestion.answerIndex !== undefined &&
                        selectedAnswer === getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex }, mcqOptionCount)
                      )
                    }
                  >
                    {isSubmitted && (
                      <>
                        {currentQuestion.answerIndex !== undefined &&
                        selectedAnswer === getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex }, mcqOptionCount)
                          ? "Correct!"
                          : `Incorrect. The correct answer is ${getDisplayCorrectLabel({ answerIndex: currentQuestion.answerIndex ?? 0 }, mcqOptionCount)}.`}
                        {currentQuestion.explanation && (
                          <div className="mt-1.5">
                            <PrettyExplanation>
                              {getDisplayExplanation(
                                currentQuestion.explanation,
                                { answerIndex: currentQuestion.answerIndex ?? 0 },
                                mcqOptionCount
                              )}
                            </PrettyExplanation>
                          </div>
                        )}
                      </>
                    )}
                  </ExplanationPanel>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 fixed bottom-0 left-0 right-0 z-50">
            <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2.5">
              <div className="flex justify-between items-center gap-2 sm:gap-4">
                <div className="flex flex-1 items-center gap-2 min-w-0">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isSubmitted ? handleNext : handleSkip}
                    disabled={currentIndex >= reviewQuestions.length - 1}
                    className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 disabled:opacity-30 rounded-xl shrink-0 flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex justify-center items-center flex-shrink-0">
                  {!isSubmitted && (
                    <Button
                      onClick={handleSubmit}
                      disabled={!selectedAnswer}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl disabled:opacity-50"
                    >
                      Submit
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
                    disabled={isRemoving}
                    className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs sm:text-sm"
                    title="Remove from review"
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
                    {reviewQuestions.length > 0 ? "Save & Exit" : "Exit"}
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
  );
}
