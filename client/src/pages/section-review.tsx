import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExplanationChat } from "@/components/ui/explanation-chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  section_code?: string;
  originalTestIndex?: number; // Added to store the original test index
}

export default function SectionReview() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, testId, section: sectionCode } = router.query;
  const isMobile = useIsMobile();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sectionData, setSectionData] = useState<any>(null); // State to hold section data

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Consolidated useEffect for fetching section data, handling current test data
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!subjectId || !testId || !sectionCode || !isAuthenticated) return;

      // Handle current test data from query params
      if (testId === "current" && router.query.data) {
        try {
          const data = JSON.parse(router.query.data as string);
          setSectionData(data);
          setQuestions(data.questions); // Set questions from parsed data
          setUserAnswers(data.userAnswers); // Set userAnswers from parsed data
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("Error parsing current test data:", error);
        }
      }

      try {
        // For "all" section, fetch entire test
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
          console.log("📤 Fetching section data for:", {
            subjectId,
            testId,
            sectionCode,
          });
          const response = await apiRequest(
            "GET",
            `/api/user/subjects/${subjectId}/test-results/${testId}/section/${sectionCode}`,
          );

          console.log("📡 API Response status:", response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ API Error:", {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText,
            });
            throw new Error("Failed to fetch section questions");
          }

          const data = await response.json();
          console.log("📥 Section data received:", {
            success: data.success,
            questionCount: data.data?.questions?.length,
            answerCount: Object.keys(data.data?.userAnswers || {}).length,
            sectionCode: sectionCode,
            unitNumber: data.data?.unitNumber,
            sectionName: data.data?.sectionName,
            firstQuestion: data.data?.questions?.[0],
            userAnswersSample: data.data?.userAnswers,
          });
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

  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage,
  );

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
    if (testId === "current") {
      router.push(`/quiz?subject=${subjectId}&unit=full-length`);
    } else if (sectionCode === "all") {
      // Full review goes back to test results
      router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
    } else {
      // Unit-wise review goes back to test results summary
      router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-khan-background via-white to-white relative overflow-hidden">
      {/* Background decoration - matching hero style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-khan-green/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-khan-blue/5 rounded-full blur-3xl"></div>
      </div>

      <Navigation />
      <main className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-center mb-2">
              <h2 className="text-base md:text-xl font-semibold whitespace-nowrap">
                {sectionCode === "all"
                  ? `Full Review - Page ${currentPage + 1} of ${totalPages}`
                  : `Review Unit ${sectionData?.unitNumber || ""} - Page ${currentPage + 1} of ${totalPages}`}
              </h2>
            </div>
            <Progress
              value={((currentPage + 1) / totalPages) * 100}
              className="h-2"
            />
          </div>

          <div className="space-y-4 mb-6">
            {currentQuestions.map((q, idx) => {
              const globalIndex = currentPage * questionsPerPage + idx;
              // Use the originalTestIndex from the question object (set by API)
              const displayNumber =
                q.originalTestIndex !== undefined
                  ? q.originalTestIndex + 1
                  : globalIndex + 1;

              const correctAnswerLabel = String.fromCharCode(65 + q.answerIndex);
              // Use originalTestIndex for userAnswer lookup if available, otherwise globalIndex
              const userAnswer =
                userAnswers[
                  q.originalTestIndex !== undefined
                    ? q.originalTestIndex
                    : globalIndex
                ];
              const isCorrect = userAnswer === correctAnswerLabel;

              return (
                <Card key={globalIndex} className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium leading-relaxed">
                      {displayNumber}. {q.prompt}
                      {sectionCode === "all" &&
                        sectionData?.sectionBreakdown &&
                        q.section_code && (
                          <span className="ml-2 font-bold text-khan-green">
                            (UNIT{" "}
                            {sectionData.sectionBreakdown[q.section_code]
                              ?.unitNumber || ""}
                            )
                          </span>
                        )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      {["A", "B", "C", "D", "E"].map((label) => {
                        const choiceBlocks = q.choices[label];
                        if (
                          !choiceBlocks ||
                          choiceBlocks.length === 0 ||
                          (choiceBlocks.length === 1 &&
                            choiceBlocks[0].type === "text" &&
                            !choiceBlocks[0].value)
                        ) {
                          return null;
                        }

                        const isUserAnswer = userAnswer === label;
                        const isCorrectAnswer = label === correctAnswerLabel;

                        // Determine background and border colors
                        let bgColor = "bg-white";
                        let borderColor = "border-gray-200";

                        if (isUserAnswer && isCorrect) {
                          // User's answer is correct - light green
                          bgColor = "bg-green-50";
                          borderColor = "border-green-500";
                        } else if (isUserAnswer && !isCorrect) {
                          // User's answer is wrong - light red
                          bgColor = "bg-red-50";
                          borderColor = "border-red-500";
                        } else if (isCorrectAnswer && !isCorrect) {
                          // Show correct answer in green when user was wrong
                          bgColor = "bg-green-50";
                          borderColor = "border-green-500";
                        }

                        return (
                          <div
                            key={label}
                            className={`flex items-start space-x-3 rounded-lg border-2 p-3 transition-all ${bgColor} ${borderColor}`}
                          >
                            <div className="flex items-center gap-2 min-w-[2rem]">
                              <span className="font-semibold text-sm">{label}.</span>
                              {isCorrectAnswer && (
                                <CheckCircle className="text-green-500 flex-shrink-0 h-5 w-5" />
                              )}
                              {isUserAnswer && !isCorrect && (
                                <XCircle className="text-red-500 flex-shrink-0 h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 prose prose-sm max-w-none">
                              {/* Assuming BlockRenderer is defined elsewhere and handles rendering blocks */}
                              {/* If choices are simple strings, render them directly */}
                              {typeof choiceBlocks === 'string' ? (
                                choiceBlocks
                              ) : (
                                choiceBlocks.map((block, blockIdx) => (
                                  <span key={blockIdx}>{block.value}</span>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`p-2 rounded-lg text-sm ${isCorrect ? "bg-green-100" : "bg-red-100"}`}
                    >
                      <p className="font-semibold">
                        Your answer: {userAnswer || "Not answered"}
                        {isCorrect
                          ? " ✓ Correct"
                          : ` ✗ Incorrect (Correct: ${correctAnswerLabel})`}
                      </p>
                    </div>

                    {q.explanation && (
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
                              {q.explanation}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {/* Added ExplanationChat component here */}
                    {q.explanation && (
                      <ExplanationChat
                        questionPrompt={q.prompt}
                        explanation={q.explanation}
                        correctAnswer={q.choices[q.answerIndex]}
                        choices={q.choices}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between gap-4">
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              variant="outline"
              className="px-8"
            >
              <ArrowLeft className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {!isMobile && "Previous"}
            </Button>

            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="bg-khan-blue hover:bg-khan-blue/90 px-8"
            >
              {!isMobile && "Next"}
              <ArrowRight className={isMobile ? "" : "ml-2 h-4 w-4"} />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}