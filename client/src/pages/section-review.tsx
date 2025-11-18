import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewQuestionPalette } from "@/components/quiz/ReviewQuestionPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSectionByCode } from "@/subjects";

interface Question {
  id: string;
  prompt: string;
  prompt_blocks?: any[];
  choices: { [key: string]: any[] };
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
}

interface SectionData {
  questions: Question[];
  userAnswers: { [key: number]: string };
  sectionName: string;
  unitNumber: number;
}

export default function SectionReview() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { subject: subjectId, testId, section: sectionCode } = router.query;

  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchSectionData = async () => {
      if (!subjectId || !testId || !sectionCode || !isAuthenticated) return;

      try {
        const endpoint =
          sectionCode === "all"
            ? `/api/user/subjects/${subjectId}/test-results/${testId}`
            : `/api/user/subjects/${subjectId}/test-results/${testId}/section/${sectionCode}`;

        const response = await apiRequest("GET", endpoint);
        if (!response.ok) throw new Error("Failed to fetch section data");

        const data = await response.json();

        if (sectionCode === "all") {
          setSectionData({
            questions: data.data.questions || [],
            userAnswers: data.data.userAnswers || {},
            sectionName: "All Questions",
            unitNumber: 0,
          });
        } else {
          const sectionInfo = getSectionByCode(subjectId as string, sectionCode as string);
          setSectionData({
            questions: data.data.questions || [],
            userAnswers: data.data.userAnswers || {},
            sectionName: sectionInfo?.name || data.data.sectionName || "Unknown Section",
            unitNumber: sectionInfo?.unitNumber || data.data.unitNumber || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching section data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSectionData();
  }, [subjectId, testId, sectionCode, isAuthenticated]);

  const handleNext = () => {
    if (sectionData && currentQuestionIndex < sectionData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
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

  if (!sectionData || sectionData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-khan-gray-medium">No questions found for this section</p>
            <Button
              onClick={() =>
                router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`)
              }
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = sectionData.questions[currentQuestionIndex];
  const userAnswer = sectionData.userAnswers[currentQuestionIndex];
  const correctAnswer = String.fromCharCode(65 + currentQuestion.answerIndex);
  const isCorrect = userAnswer === correctAnswer;

  return (
    <div className="min-h-screen bg-gradient-to-b from-khan-background via-white to-white">
      <Navigation />
      <main className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <Button
              onClick={() =>
                router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`)
              }
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>

            <h1 className="text-2xl md:text-3xl font-bold text-khan-gray-dark mb-2">
              {sectionData.sectionName}
              {sectionData.unitNumber > 0 && (
                <span className="text-khan-green ml-2">Unit {sectionData.unitNumber}</span>
              )}
            </h1>
            <p className="text-khan-gray-medium">
              Question {currentQuestionIndex + 1} of {sectionData.questions.length}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                selectedAnswer={userAnswer}
                onAnswerSelect={() => {}}
                showCorrectAnswer={true}
                showExplanation={true}
                isReviewMode={true}
              />

              <div className="flex gap-4 mt-6">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === sectionData.questions.length - 1}
                  className="flex-1 bg-khan-green hover:bg-khan-green-light"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-4">
                  <ReviewQuestionPalette
                    totalQuestions={sectionData.questions.length}
                    currentQuestion={currentQuestionIndex}
                    userAnswers={sectionData.userAnswers}
                    correctAnswers={sectionData.questions.map((q) =>
                      String.fromCharCode(65 + q.answerIndex)
                    )}
                    onQuestionSelect={setCurrentQuestionIndex}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}