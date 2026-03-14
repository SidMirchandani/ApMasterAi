import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import { QuizBottomBar } from "@/components/quiz/QuizBottomBar";
import { ReviewQuestionDetail } from "@/components/quiz/ReviewQuestionDetail";
import { ReviewQuestionPalette } from "@/components/quiz/ReviewQuestionPalette";
import { getSectionInfo, getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel } from "@/lib/mcqDisplay";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

interface Question {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  prompt?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
  originalTestIndex?: number;
}

export default function SectionReview() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, testId, section: sectionCode, mode } = router.query;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sectionData, setSectionData] = useState<any>(null);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);

  const isReviewMode = mode === "review" || sectionCode === "all" || sectionCode === "incorrect";

  // Reset palette state when changing questions
  useEffect(() => {
    setShowQuestionPalette(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchSectionData = async () => {
      if (!subjectId || !testId || !sectionCode || !isAuthenticated) return;

      if (testId === "current" && router.query.data) {
        try {
          const data = JSON.parse(router.query.data as string);
          setSectionData(data);
          setQuestions(normalizeQuestions(data.questions));
          setUserAnswers(data.userAnswers);
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("Error parsing current test data:", error);
        }
      }

      try {
        if (sectionCode === "all" || sectionCode === "incorrect") {
          const response = await apiRequest(
            "GET",
            `/api/user/subjects/${subjectId}/test-results/${testId}`,
          );
          if (!response.ok) throw new Error("Failed to fetch test results");

          const data = await response.json();
          setSectionData(data.data);
          const allQuestions = normalizeQuestions(data.data.questions);
          const allUserAnswers = data.data.userAnswers || {};

          if (sectionCode === "incorrect") {
            const subject = typeof subjectId === "string"
              ? getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId)
              : undefined;
            const mcqOpts = subject?.metadata?.mcqOptionCount;
            const incorrectWithIndex: { q: Question; originalIndex: number }[] = [];
            allQuestions.forEach((q: Question, idx: number) => {
              const correctLabel = getDisplayCorrectLabel(q, mcqOpts);
              if (allUserAnswers[idx] !== correctLabel) {
                incorrectWithIndex.push({
                  q: { ...q, originalTestIndex: idx },
                  originalIndex: idx,
                });
              }
            });
            incorrectWithIndex.sort((a, b) => a.originalIndex - b.originalIndex);
            const filteredQuestions = incorrectWithIndex.map((x) => x.q);
            const filteredUserAnswers: { [key: number]: string } = {};
            filteredQuestions.forEach((q) => {
              const orig = q.originalTestIndex ?? 0;
              filteredUserAnswers[orig] = allUserAnswers[orig];
            });
            setQuestions(filteredQuestions);
            setUserAnswers(filteredUserAnswers);
          } else {
            setQuestions(allQuestions);
            setUserAnswers(allUserAnswers);
          }
        } else {
          const response = await apiRequest(
            "GET",
            `/api/user/subjects/${subjectId}/test-results/${testId}/section/${sectionCode}`,
          );

          if (!response.ok) {
            throw new Error("Failed to fetch section questions");
          }

          const data = await response.json();
          setSectionData(data.data);
          setQuestions(normalizeQuestions(data.data.questions));
          setUserAnswers(data.data.userAnswers);
        }
      } catch (error) {
        console.error("Error fetching section questions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSectionData();
  }, [subjectId, testId, sectionCode, isAuthenticated, router.query.data]);

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

  const handleBackNavigation = () => {
    router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
  };

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const subject = typeof subjectId === "string" ? getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId) : undefined;
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  // For "incorrect" mode userAnswers are keyed by global index; for "all" and specific section use current index
  const userAnswer = userAnswers[
    sectionCode === "incorrect" ? (currentQuestion.originalTestIndex ?? currentQuestionIndex) : currentQuestionIndex
  ];

  const displayNumber = currentQuestion.originalTestIndex !== undefined
    ? currentQuestion.originalTestIndex + 1
    : currentQuestionIndex + 1;

  // Create a map for palette: "incorrect" uses global index keys; "all" and specific section use list index
  const userAnswersForPalette = questions.reduce((acc, q, idx) => {
    const key = sectionCode === "incorrect" ? (q.originalTestIndex ?? idx) : idx;
    acc[idx] = userAnswers[key];
    return acc;
  }, {} as { [key: number]: string });

  // Create correct answers map (display labels for 4-option E→D swap)
  const subjectForMap = typeof subjectId === "string" ? getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId) : undefined;
  const mcqCountForMap = subjectForMap?.metadata?.mcqOptionCount;
  const correctAnswers = questions.reduce((acc, q, idx) => {
    acc[idx] = getDisplayCorrectLabel(q, mcqCountForMap);
    return acc;
  }, {} as { [key: number]: string });

  // Create original indices array for unit reviews
  const originalIndices = questions.map((q) => 
    q.originalTestIndex !== undefined ? q.originalTestIndex : 0
  );

  const apiCode = subject?.subjectCode ?? (typeof subjectId === "string" ? subjectId : "");
  const unitLabel =
    sectionCode === "all" && currentQuestion.section_code && sectionData?.sectionBreakdown
      ? `UNIT ${sectionData.sectionBreakdown[currentQuestion.section_code]?.unitNumber ?? ""}`
      : sectionCode !== "all" && sectionCode !== "incorrect"
        ? (() => {
            const info = getSectionInfo(apiCode, sectionCode);
            return info ? `UNIT ${info.unitNumber ?? ""}` : undefined;
          })()
        : undefined;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Navigation with Breadcrumbs */}
      <Navigation />

      <div className="flex-1 overflow-y-auto mb-14 pt-2">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <ReviewQuestionDetail
            question={currentQuestion}
            userAnswer={userAnswer}
            questionNumber={displayNumber}
            unitLabel={unitLabel}
            mcqOptionCount={mcqOptionCount}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <QuizBottomBar
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onOpenPalette={isReviewMode ? undefined : () => setShowQuestionPalette(true)}
          onPrevious={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          onNext={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
          canGoPrevious={currentQuestionIndex > 0}
          canGoNext={currentQuestionIndex < questions.length - 1}
          isLastQuestion={currentQuestionIndex === questions.length - 1}
          reviewOnly={isReviewMode}
          onExit={handleBackNavigation}
          exitLabel="Exit"
        />
      </div>

      {!isReviewMode && (
      <ReviewQuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        currentQuestion={currentQuestionIndex}
        userAnswers={userAnswersForPalette}
        correctAnswers={correctAnswers}
        onQuestionSelect={(index) => {
          setCurrentQuestionIndex(index);
          setShowQuestionPalette(false);
        }}
        showOriginalNumbers={sectionCode !== "all" && sectionCode !== "incorrect"}
        originalIndices={originalIndices}
      />
      )}
    </div>
  );
}