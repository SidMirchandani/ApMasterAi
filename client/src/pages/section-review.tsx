import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Import AlertDialog

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  section_code?: string;
}

export default function SectionReview() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId, testId, section: sectionCode } = router.query;
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
      if (testId === 'current' && router.query.data) {
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
        const response = await apiRequest("GET", `/api/user/subjects/${subjectId}/test-results/${testId}/section/${sectionCode}`);
        if (!response.ok) throw new Error("Failed to fetch section questions");

        const data = await response.json();
        setSectionData(data.data);
        setQuestions(data.data.questions);
        setUserAnswers(data.data.userAnswers);
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
  const currentQuestions = questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

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

  // Function to handle delete confirmation and mutation
  const handleDeleteConfirmation = async () => {
    try {
      await apiRequest("DELETE", `/api/user/subjects/${subjectId}/tests/${testId}`);
      router.push(`/subject/${subjectId}`); // Redirect to subject page after deletion
    } catch (error) {
      console.error("Error deleting test:", error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">
            Review - Page {currentPage + 1} of {totalPages} (Questions {currentPage * questionsPerPage + 1}-{Math.min((currentPage + 1) * questionsPerPage, questions.length)})
          </h2>
          {/* Save & Exit button for full-length quizzes */}
          {testId === 'current' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="bg-khan-blue hover:bg-khan-blue/90">
                  Save & Exit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save and Exit Quiz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your progress will be saved, and you can resume this quiz later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    // Logic to save progress and add to history
                    try {
                      await apiRequest("POST", `/api/user/subjects/${subjectId}/tests/save-and-exit`, {
                        testId: testId, // Assuming testId is relevant for saving
                        sectionCode: sectionCode,
                        userAnswers: userAnswers, // Save current answers
                        // other relevant data to save progress
                      });
                      router.push(`/quiz-history?subject=${subjectId}&testId=${testId}`); // Redirect to quiz history
                      alert("Quiz saved and ready to resume!");
                    } catch (error) {
                      console.error("Error saving and exiting quiz:", error);
                      alert("Failed to save quiz progress. Please try again.");
                    }
                  }}>
                    Save & Exit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <Progress value={((currentPage + 1) / totalPages) * 100} className="h-2" />


        <div className="space-y-6 mb-6">
          {currentQuestions.map((q, idx) => {
            const globalIndex = currentPage * questionsPerPage + idx;
            const options = q.choices.map((choice, i) => ({
              label: String.fromCharCode(65 + i),
              value: choice,
            }));
            const correctAnswerLabel = String.fromCharCode(65 + q.answerIndex);
            const userAnswer = userAnswers[globalIndex];
            const isCorrect = userAnswer === correctAnswerLabel;

            return (
              <Card key={globalIndex} className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg font-medium leading-relaxed">
                    {globalIndex + 1}. {q.prompt}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {options.map((option) => {
                      const isUserAnswer = userAnswer === option.label;
                      const isCorrectAnswer = option.label === correctAnswerLabel;

                      return (
                        <div
                          key={option.label}
                          className={`w-full text-left p-4 rounded-lg border-2 ${
                            isCorrectAnswer
                              ? "border-green-500 bg-green-50"
                              : isUserAnswer && !isCorrect
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                                isCorrectAnswer
                                  ? "bg-green-500 text-white"
                                  : isUserAnswer && !isCorrect
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {option.label}
                            </div>
                            <div className="flex-1 pt-1">{option.value}</div>
                            {isCorrectAnswer && <CheckCircle className="text-green-500 flex-shrink-0" />}
                            {isUserAnswer && !isCorrect && <XCircle className="text-red-500 flex-shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`p-3 rounded-lg mb-3 ${isCorrect ? "bg-green-100" : "bg-red-100"}`}>
                    <p className="font-semibold">
                      Your answer: {userAnswer || "Not answered"}
                      {isCorrect ? " ✓ Correct" : ` ✗ Incorrect (Correct: ${correctAnswerLabel})`}
                    </p>
                  </div>

                  {q.explanation && (
                    <Card className="border-khan-blue bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle className="text-khan-blue h-5 w-5" />
                          Explanation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-gray-700">{q.explanation}</p>
                      </CardContent>
                    </Card>
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
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentPage === totalPages - 1 ? (
            // Final page of the review section
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this test? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirmation}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="bg-khan-blue hover:bg-khan-blue/90 px-8"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}