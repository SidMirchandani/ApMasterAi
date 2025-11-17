import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "@/components/quiz/BlockRenderer";
import { QuizHeader } from "@/components/quiz/QuizHeader";
import { QuizBottomBar } from "@/components/quiz/QuizBottomBar";
import { EnhancedQuestionPalette } from "@/components/quiz/EnhancedQuestionPalette";

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
  const { subject: subjectId, testId, section: sectionCode } = router.query;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sectionData, setSectionData] = useState<any>(null);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);

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
          setQuestions(data.questions);
          setUserAnswers(data.userAnswers);
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("Error parsing current test data:", error);
        }
      }

      try {
        if (sectionCode === "all") {
          const response = await apiRequest(
            "GET",
            `/api/user/subjects/${subjectId}/test-results/${testId}`,
          );
          if (!response.ok) throw new Error("Failed to fetch test results");

          const data = await response.json();
          setSectionData(data.data);
          setQuestions(data.data.questions);
          setUserAnswers(data.data.userAnswers);
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
          setQuestions(data.data.questions);
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

  const correctAnswerLabel = String.fromCharCode(65 + currentQuestion.answerIndex);
  const userAnswer = userAnswers[
    currentQuestion.originalTestIndex !== undefined
      ? currentQuestion.originalTestIndex
      : currentQuestionIndex
  ];
  const isCorrect = userAnswer === correctAnswerLabel;

  const allChoices = Object.keys(currentQuestion.choices) as Array<"A" | "B" | "C" | "D" | "E">;
  const choices = allChoices.filter((label) => {
    if (label !== "E") return true;
    const choiceBlocks = currentQuestion.choices[label];
    if (!choiceBlocks || choiceBlocks.length === 0) return false;
    if (choiceBlocks.length === 1 && 
        choiceBlocks[0].type === "text" && 
        (!choiceBlocks[0].value || choiceBlocks[0].value.trim() === "")) {
      return false;
    }
    return true;
  });

  const displayNumber = currentQuestion.originalTestIndex !== undefined
    ? currentQuestion.originalTestIndex + 1
    : currentQuestionIndex + 1;

  // Create a map for palette to show only relevant questions
  const userAnswersForPalette = questions.reduce((acc, q, idx) => {
    const originalIdx = q.originalTestIndex !== undefined ? q.originalTestIndex : idx;
    acc[idx] = userAnswers[originalIdx];
    return acc;
  }, {} as { [key: number]: string });

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50">
        <QuizHeader
          title={sectionCode === "all" 
            ? `Full Test Review` 
            : `Unit ${sectionData?.unitNumber || ""} Review - ${sectionData?.sectionName || ""}`}
          timeElapsed={0}
          timerHidden={true}
          onExitExam={handleBackNavigation}
        />
      </div>

      <div className="flex-1 overflow-y-auto mt-16 md:mt-16 mb-14">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between border-b pb-3 -mx-6 px-6 -mt-6 pt-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="bg-black text-white px-3 py-1 font-bold text-sm rounded">
                    {displayNumber}
                  </div>
                  {sectionCode === "all" && currentQuestion.section_code && sectionData?.sectionBreakdown && (
                    <span className="text-sm font-bold text-khan-green">
                      UNIT {sectionData.sectionBreakdown[currentQuestion.section_code]?.unitNumber || ""}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Question Prompt */}
              <div className="mb-6 text-base leading-relaxed">
                <BlockRenderer blocks={currentQuestion.prompt_blocks} />
              </div>

              {/* Choices */}
              <div className="space-y-3">
                {choices.map((label) => {
                  const isUserAnswer = userAnswer === label;
                  const isCorrectAnswer = label === correctAnswerLabel;

                  let bgColor = "bg-white";
                  let borderColor = "border-gray-200";
                  let textColor = "text-gray-800";

                  if (isCorrectAnswer) {
                    bgColor = "bg-green-50";
                    borderColor = "border-green-500";
                    textColor = "text-green-900";
                  } else if (isUserAnswer && !isCorrect) {
                    bgColor = "bg-red-50";
                    borderColor = "border-red-500";
                    textColor = "text-red-900";
                  }

                  return (
                    <div
                      key={label}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 ${bgColor} ${borderColor}`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold ${
                        isCorrectAnswer 
                          ? 'border-green-600 bg-green-100 text-green-700'
                          : isUserAnswer && !isCorrect
                            ? 'border-red-600 bg-red-100 text-red-700'
                            : 'border-gray-400 bg-white'
                      }`}>
                        {label}
                      </div>
                      <div className={`flex-1 pt-1.5 ${textColor}`}>
                        <BlockRenderer blocks={currentQuestion.choices[label]} />
                        {isCorrectAnswer && (
                          <div className="mt-2 text-sm font-semibold text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Correct Answer
                          </div>
                        )}
                        {isUserAnswer && !isCorrect && (
                          <div className="mt-2 text-sm font-semibold text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Your Answer
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`p-2 rounded-lg text-sm ${isCorrect ? "bg-green-100" : "bg-red-100"}`}>
                <p className="font-semibold">
                  Your answer: {userAnswer || "Not answered"}
                  {isCorrect
                    ? " ✓ Correct"
                    : ` ✗ Incorrect (Correct: ${correctAnswerLabel})`}
                </p>
              </div>

              {currentQuestion.explanation && (
                <Card className="border-khan-blue bg-blue-50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="text-khan-blue h-4 w-4" />
                      Explanation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentQuestion.explanation}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}
              {currentQuestion.explanation && (
                <ExplanationChat
                  questionPrompt={currentQuestion.prompt_blocks}
                  explanation={currentQuestion.explanation}
                  correctAnswer={currentQuestion.choices[String.fromCharCode(65 + currentQuestion.answerIndex) as "A" | "B" | "C" | "D" | "E"]}
                  choices={currentQuestion.choices}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <QuizBottomBar
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onOpenPalette={() => setShowQuestionPalette(true)}
          onPrevious={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          onNext={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
          canGoPrevious={currentQuestionIndex > 0}
          canGoNext={currentQuestionIndex < questions.length - 1}
          isLastQuestion={currentQuestionIndex === questions.length - 1}
        />
      </div>

      <EnhancedQuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        currentQuestion={currentQuestionIndex}
        userAnswers={userAnswersForPalette}
        flaggedQuestions={new Set()}
        onQuestionSelect={(index) => {
          setCurrentQuestionIndex(index);
          setShowQuestionPalette(false);
        }}
      />
    </div>
  );
}