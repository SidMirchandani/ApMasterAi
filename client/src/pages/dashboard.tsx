import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trash2, Plus, Calendar, AlertTriangle } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";




interface DashboardSubject {
  id: number;
  userId: number;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string | number | Date | { seconds: number } | null;
  progress: number;
  masteryLevel: number;
  lastStudied?: string | number | Date | { seconds: number } | null;
  dateAdded?: string | number | Date | { seconds: number } | null;
}

const difficultyColors: Record<string, string> = {
  "Easy": "bg-green-100 text-green-800 border-green-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Hard": "bg-orange-100 text-orange-800 border-orange-200",
  "Very Hard": "bg-red-100 text-red-800 border-red-200"
};

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [subjectToRemove, setSubjectToRemove] = useState<DashboardSubject | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  // Fetch user profile
  const { data: userProfile } = useQuery<{
    success: boolean;
    data: {
      firstName: string;
      lastName: string;
      displayName: string;
      email: string;
    };
  }>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/me");
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!user,
  });

  // Optimized data fetching with better loading states
  const {
    data: subjectsResponse,
    isLoading: subjectsLoading,
    error: subjectsError,
    refetch: refetchSubjects,
    isFetching: subjectsFetching
  } = useQuery<{success: boolean, data: DashboardSubject[]}>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/subjects");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Memoize subjects array to prevent unnecessary re-renders
  const subjects = useMemo(() => subjectsResponse?.data || [], [subjectsResponse?.data]);

  // Split into active and archived
  const activeSubjects = useMemo(() => subjects.filter(s => !(s as any).archived), [subjects]);
  const archivedSubjects = useMemo(() => subjects.filter(s => (s as any).archived), [subjects]);

  // Handle query errors with useEffect since onError is deprecated in v5
  useEffect(() => {
    if (subjectsError && !subjectsLoading) {
      toast({
        title: "Error loading subjects",
        description: subjectsError.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [subjectsError, subjectsLoading, toast]);

  // Track if we have initial data or are still loading for the first time
  const isInitialLoading = subjectsLoading && !subjectsResponse;

  // Archive subject mutation
  const archiveSubjectMutation = useMutation({
    mutationFn: async ({ subjectDocId, archive }: { subjectDocId: string; archive: boolean }) => {
      const response = await apiRequest("PUT", `/api/user/subjects/${subjectDocId}`, { archived: archive });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to archive subject");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({
        title: "Subject archived",
        description: "Your subject has been moved to the archive.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error archiving subject",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  // Simplified remove subject mutation
  const removeSubjectMutation = useMutation({
    mutationFn: async (subjectDocId: string) => {
      const response = await apiRequest("DELETE", `/api/user/subjects/${subjectDocId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove subject");
      }
      return response.json();
    },
    onMutate: async (subjectDocId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["subjects"] });

      // Snapshot the previous value
      const previousSubjects = queryClient.getQueryData(["subjects"]);

      // Optimistically update to the new value - remove the subject immediately
      queryClient.setQueryData(["subjects"], (old: any) => {
        if (!old?.data) return old;
        console.log('[Dashboard] Removing subject with ID:', subjectDocId);
        console.log('[Dashboard] Current subjects:', old.data.map((s: DashboardSubject) => ({ id: s.id, name: s.name })));
        const filtered = old.data.filter((subject: DashboardSubject) => {
          const subjectIdStr = typeof subject.id === 'number' ? subject.id.toString() : subject.id;
          return subjectIdStr !== subjectDocId;
        });
        console.log('[Dashboard] After filter:', filtered.map((s: DashboardSubject) => ({ id: s.id, name: s.name })));
        return {
          ...old,
          data: filtered
        };
      });

      // Return a context object with the snapshotted value
      return { previousSubjects };
    },
    onError: (err, subjectDocId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      console.error('[Dashboard] Remove subject failed:', err);
      if (context?.previousSubjects) {
        queryClient.setQueryData(["subjects"], context.previousSubjects);
      }
      toast({
        title: "Error removing subject",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    onSuccess: (data, subjectDocId) => {
      console.log('[Dashboard] Remove subject succeeded');

      toast({
        title: "Subject removed",
        description: "Your subject has been successfully removed.",
      });

      setSubjectToRemove(null);

      // Don't invalidate - the optimistic update in onMutate already updated the cache
      // Both dashboard and courses page use the same ["subjects"] query key,
      // so the optimistic update will reflect in both pages automatically
    }
  });

  // Error handling is now done in the mutation's onError callback

  // Simple auth redirect
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleRemoveSubject = (subject: DashboardSubject) => {
    setSubjectToRemove(subject);
  };

  const confirmRemoveSubject = () => {
    if (deleteConfirmText.toLowerCase() === "delete") {
      setShowSecondConfirm(true);
    }
  };

  const finalConfirmRemove = () => {
    if (subjectToRemove) {
      removeSubjectMutation.mutate(subjectToRemove.id.toString());
      setShowSecondConfirm(false);
      setDeleteConfirmText("");
      setSubjectToRemove(null);
    }
  };

  const handleArchiveSubject = (subject: DashboardSubject) => {
    archiveSubjectMutation.mutate({
      subjectDocId: subject.id.toString(),
      archive: !(subject as any).archived
    });
  };

  const handleStartStudying = (subjectId: string) => {
    console.log(`Starting to study ${subjectId}`);
    // Navigate to study page with subject ID
    router.push(`/study?subject=${subjectId}`);
  };

  // Show loading state only when necessary
  if (loading) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green mx-auto mb-4"></div>
            <p className="text-khan-gray-medium">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Show error state if subjects failed to load
  if (subjectsError && !subjectsLoading) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Alert className="mb-8 border-khan-red/20 bg-khan-red/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-khan-red">
                Failed to load your subjects. Please try again.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSubjects()}
                  className="ml-4 border-khan-red text-khan-red hover:bg-khan-red hover:text-white"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-khan-background overflow-x-hidden">
      <Navigation />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-khan-gray-dark mb-2">
              Welcome back, {userProfile?.data?.firstName || user?.email?.split('@')[0] || 'Student'}!
            </h1>
            <p className="text-xl text-khan-gray-medium">
              Continue your AP preparation journey
            </p>
          </div>

          {isInitialLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green mx-auto mb-4"></div>
                <p className="text-khan-gray-medium">Loading your subjects...</p>
              </div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="mx-auto h-24 w-24 text-khan-gray-light mb-6" />
              <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">
                No subjects added yet
              </h2>
              <p className="text-khan-gray-medium mb-8">
                Add AP subjects to your dashboard to start your preparation journey
              </p>
              <Button
                onClick={() => router.push('/learn')}
                className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold px-8"
              >
                <Plus className="mr-2 w-5 h-5" />
                Browse Subjects
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-khan-gray-dark">My Subjects</h2>
                <Button
                  onClick={() => router.push('/learn')}
                  variant="outline"
                  className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white transition-colors font-semibold"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add Subject
                </Button>
              </div>

              {subjectsFetching && subjects.length > 0 && (
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center text-sm text-khan-gray-medium">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-khan-green mr-2"></div>
                    Refreshing...
                  </div>
                </div>
              )}
              {(
                <div className="space-y-4">
                  {activeSubjects.map((subject: DashboardSubject) => (
                    <Card key={subject.id} className="bg-white hover:shadow-md transition-all border-2 border-gray-100 w-full">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-xl font-bold text-khan-gray-dark">
                            {subject.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchiveSubject(subject)}
                              className="border-khan-blue text-khan-blue hover:bg-khan-blue hover:text-white"
                            >
                              Archive
                            </Button>
                            <AlertDialog open={subjectToRemove?.id === subject.id && !showSecondConfirm} onOpenChange={(open) => {
                              if (!open) {
                                setSubjectToRemove(null);
                                setDeleteConfirmText("");
                              }
                            }}>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={() => handleRemoveSubject(subject)}
                                  className="text-khan-gray-light hover:text-khan-red transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Permanently Delete Subject</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. All your progress for <strong>"{subject.name}"</strong> will be permanently deleted.
                                    <div className="mt-4">
                                      <p className="mb-2 font-medium text-gray-900">Type "delete" to confirm:</p>
                                      <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="Type delete here"
                                      />
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={confirmRemoveSubject}
                                    disabled={deleteConfirmText.toLowerCase() !== "delete"}
                                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Continue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog open={showSecondConfirm} onOpenChange={setShowSecondConfirm}>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you absolutely sure? This will permanently delete all data for <strong>"{subjectToRemove?.name}"</strong>. This action is irreversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => {
                                    setShowSecondConfirm(false);
                                    setDeleteConfirmText("");
                                    setSubjectToRemove(null);
                                  }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={finalConfirmRemove}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Yes, Delete Forever
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <p className="text-khan-gray-medium text-base leading-relaxed">
                          {subject.description}
                        </p>
                      </CardHeader>

                      <CardContent>
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0 sm:space-x-6">
                          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
                            <div className="flex items-center space-x-2 text-khan-gray-medium">
                              <BookOpen className="w-4 h-4" />
                              <span className="text-khan-gray-dark font-medium">{subject.units} Units</span>
                            </div>
                            <div className="flex items-center space-x-2 text-khan-gray-medium">
                              <Clock className="w-4 h-4" />
                              <span className="text-khan-gray-dark font-medium">{formatDate(subject.examDate)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 group relative">
                            {Array.from({ length: subject.units }).map((_, index) => {
                              const unitId = `unit${index + 1}`;
                              const unitData = (subject as any).unitProgress?.[unitId];
                              const status = unitData?.status || "not-started";

                              let bgColor = "bg-gray-200"; // not-started
                              if (status === "mastered") bgColor = "bg-green-600";
                              else if (status === "proficient") bgColor = "bg-yellow-400";
                              else if (status === "attempted") bgColor = "bg-orange-400";

                              return (
                                <div
                                  key={unitId}
                                  className={`w-6 h-6 rounded ${bgColor} border border-black transition-all flex items-center justify-center text-xs`}
                                  title={`Unit ${index + 1}: ${status.replace('-', ' ')}`}
                                >
                                  {status === "mastered" && "👑"}
                                </div>
                              );
                            })}

                            {/* Legend on hover */}
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-white shadow-lg rounded-lg p-3 border border-gray-200 z-10 whitespace-nowrap">
                              <div className="text-xs font-semibold mb-2">Unit Progress Legend</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-green-600"></div>
                                  <span>Mastered (80%+)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-yellow-400"></div>
                                  <span>Proficient (60%+)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-orange-400"></div>
                                  <span>Attempted (&lt;60%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-gray-200"></div>
                                  <span>Not Started</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-khan-gray-medium">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Added: {formatDate(subject.dateAdded)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                Last Practice: {subject.lastStudied ? formatDate(subject.lastStudied) : 'Never'}
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleStartStudying(subject.subjectId)}
                            className="w-full sm:w-auto bg-khan-green hover:bg-khan-green-light text-white min-h-[44px]"
                          >
                            Continue Practice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Archived Subjects Section */}
              {archivedSubjects.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
                    className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-khan-gray-dark">
                      Archived Subjects ({archivedSubjects.length})
                    </h3>
                    <svg
                      className={`w-5 h-5 transition-transform ${isArchiveExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isArchiveExpanded && (
                    <div className="mt-4 space-y-4">
                      {archivedSubjects.map((subject: DashboardSubject) => (
                        <Card key={subject.id} className="bg-gray-50 border-2 border-gray-200 w-full opacity-75">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between mb-2">
                              <CardTitle className="text-xl font-bold text-khan-gray-dark">
                                {subject.name}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleArchiveSubject(subject)}
                                  className="border-khan-green text-khan-green hover:bg-khan-green hover:text-white"
                                >
                                  Restore
                                </Button>
                              </div>
                            </div>
                            <p className="text-khan-gray-medium text-base leading-relaxed">
                              {subject.description}
                            </p>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}