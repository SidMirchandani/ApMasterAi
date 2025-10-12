import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Calendar, Target, PlayCircle, X } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TestHistory {
  id: string;
  date: string | number | Date | { seconds: number };
  score: number;
  percentage: number;
  totalQuestions: number;
}

interface QuizState {
  currentQuestionIndex: number;
  score: number;
  answers: Record<string, string>;
  unitProgress: Record<string, Record<string, any>>; // Assuming unitProgress structure
}

export default function FullLengthHistory() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { subject: subjectId } = router.query;
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [quizProgress, setQuizProgress] = useState<QuizState | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!subjectId || !isAuthenticated) return;

      try {
        const response = await apiRequest("GET", `/api/user/subjects/${subjectId}/unit-progress`);
        if (!response.ok) throw new Error("Failed to fetch test history");

        const data = await response.json();
        const fullLengthData = data.data?.["full-length"];

        if (fullLengthData?.history && Array.isArray(fullLengthData.history)) {
          setTestHistory(fullLengthData.history);
        }
      } catch (error) {
        console.error("Error fetching test history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [subjectId, isAuthenticated]);

  const handleStartNewTest = () => {
    router.push(`/quiz?subject=${subjectId}&unit=full-length`);
  };

  const handleViewResults = (testId: string) => {
    router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      const response = await apiRequest("DELETE", `/api/user/subjects/${subjectId}/tests/${testId}`);
      if (response.ok) {
        setTestHistory(testHistory.filter((test) => test.id !== testId));
        setIsDeleteDialogOpen(false);
        setDeleteTargetId(null);
      } else {
        throw new Error("Failed to delete test");
      }
    } catch (error) {
      console.error("Error deleting test:", error);
    }
  };

  const confirmDelete = (testId: string) => {
    setDeleteTargetId(testId);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveAndExit = async () => {
    if (!quizProgress || !subjectId) return;

    setIsSavingProgress(true);
    try {
      await apiRequest("POST", `/api/user/subjects/${subjectId}/save-quiz-progress`, {
        progress: quizProgress,
      });
      router.push(`/study?subject=${subjectId}`); // Redirect after saving
    } catch (error) {
      console.error("Error saving quiz progress:", error);
      // Show an error message to the user
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleResumeQuiz = (testId: string) => {
    router.push(`/quiz?subject=${subjectId}&testId=${testId}&resume=true`);
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

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 75) return "text-blue-600 bg-blue-50 border-blue-200";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const hasSomethingToGoBackTo = () => {
    // Logic to determine if there's a previous page to go back to
    // For now, let's assume there always is for pages other than the main dashboard
    return router.asPath !== '/dashboard'; // Example condition
  };

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {hasSomethingToGoBackTo() && (
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-3xl font-bold text-khan-gray-dark">Full-Length Test History</h1>
            </div>
            <Button
              onClick={handleStartNewTest}
              className="bg-khan-green hover:bg-khan-green/90"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start New Test
            </Button>
          </div>

          {testHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Trophy className="h-16 w-16 text-khan-gray-light mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Tests Taken Yet</h2>
                <p className="text-khan-gray-medium mb-6">
                  Start your first full-length practice test to track your progress
                </p>
                <Button onClick={handleStartNewTest} className="bg-khan-green hover:bg-khan-green/90">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Take First Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {testHistory.map((test, index) => (
                <Card key={test.id} className="relative group">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-khan-blue/10 flex items-center justify-center">
                            <span className="text-xl font-bold text-khan-blue">#{testHistory.length - index}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-khan-gray-medium" />
                              <span className="text-sm text-khan-gray-medium">{formatDateTime(test.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-khan-gray-medium" />
                              <span className="text-sm text-khan-gray-medium">
                                {test.score}/{test.totalQuestions} correct
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`px-6 py-3 rounded-lg border-2 ${getPerformanceColor(test.percentage)}`}>
                        <span className="text-2xl font-bold">{test.percentage}%</span>
                      </div>
                      <div className="absolute top-1/2 right-4 -translate-y-1/2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" onClick={() => handleResumeQuiz(test.id)}>
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => confirmDelete(test.id)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The test history and any associated progress will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTargetId && handleDeleteTest(deleteTargetId)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save and Exit Confirmation Dialog (example structure, needs to be integrated into quiz component) */}
      {isSavingProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <p className="text-lg font-semibold mb-4">Saving your progress...</p>
            <p>Please wait while we save your quiz progress. You can resume later.</p>
          </div>
        </div>
      )}
    </div>
  );
}