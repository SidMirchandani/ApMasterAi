import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trash2, Plus, Calendar, AlertTriangle } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardSubject {
  id: number;
  userId: number;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string;
  progress: number;
  masteryLevel: number;
  lastStudied?: string;
  dateAdded: string;
}

const difficultyColors = {
  "Easy": "bg-green-100 text-green-800 border-green-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200", 
  "Hard": "bg-orange-100 text-orange-800 border-orange-200",
  "Very Hard": "bg-red-100 text-red-800 border-red-200"
};

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Optimized data fetching with better caching and error handling
  const { 
    data: subjectsResponse, 
    isLoading: subjectsLoading,
    error: subjectsError,
    refetch: refetchSubjects
  } = useQuery<{success: boolean, data: DashboardSubject[]}>({
    queryKey: ["api", "user", "subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/subjects");
      return response.json();
    },
    enabled: isAuthenticated && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache
    gcTime: 15 * 60 * 1000, // 15 minutes - renamed from cacheTime
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data exists
    retry: 1, // Reduced retries for faster failure
    retryDelay: 1000, // Fixed shorter delay
    networkMode: 'online', // Only run when online
  });

  // Memoize subjects array to prevent unnecessary re-renders
  const subjects = useMemo(() => subjectsResponse?.data || [], [subjectsResponse?.data]);

  // Optimized remove subject mutation with optimistic updates
  const removeSubjectMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      await apiRequest("DELETE", `/api/user/subjects/${subjectId}`);
    },
    onMutate: async (subjectId) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["api", "user", "subjects"] });

      // Snapshot previous value
      const previousSubjects = queryClient.getQueryData(["api", "user", "subjects"]);

      // Optimistically update by removing the subject
      queryClient.setQueryData(["api", "user", "subjects"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((subject: DashboardSubject) => subject.subjectId !== subjectId)
        };
      });

      return { previousSubjects };
    },
    onError: (err, subjectId, context) => {
      // Rollback on error
      queryClient.setQueryData(["api", "user", "subjects"], context?.previousSubjects);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["api", "user", "subjects"] });
    },
  });

  // Optimized auth redirect with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Only redirect after auth state has stabilized
    if (!loading && !isAuthenticated) {
      timeoutId = setTimeout(() => {
        router.push('/login');
      }, 100); // Small delay to prevent flash
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, isAuthenticated, router]);

  const removeSubject = (subjectId: string) => {
    removeSubjectMutation.mutate(subjectId);
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
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-khan-gray-dark mb-2">
              Welcome back, {user?.email?.split('@')[0]}!
            </h1>
            <p className="text-xl text-khan-gray-medium">
              Continue your AP preparation journey
            </p>
          </div>

          {subjects.length === 0 ? (
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

              {subjectsLoading && subjects.length === 0 ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-white border-2 border-gray-100 animate-pulse w-full">
                      <div className="flex items-center justify-between p-6">
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          <div className="flex space-x-6 mt-3">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 px-6 w-64">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-2 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-3">
                          <div className="flex flex-col space-y-2">
                            <div className="h-6 bg-gray-200 rounded w-16"></div>
                            <div className="h-6 bg-gray-200 rounded w-16"></div>
                          </div>
                          <div className="h-10 bg-gray-200 rounded w-32"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subject: DashboardSubject) => (
                  <Card key={subject.id} className="bg-white hover:shadow-md transition-all border-2 border-gray-100 w-full">
                    <div className="flex items-center justify-between p-6">
                      {/* Left section - Subject info */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl font-bold text-khan-gray-dark truncate">
                              {subject.name}
                            </CardTitle>
                            <p className="text-khan-gray-medium text-sm leading-relaxed mt-1 line-clamp-2">
                              {subject.description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Stats row */}
                        <div className="flex items-center space-x-6 text-sm text-khan-gray-medium mt-3">
                          <div className="flex items-center space-x-1">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-khan-gray-dark font-medium">{subject.units} Units</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-khan-gray-dark font-medium">{subject.examDate}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Added {format(new Date(subject.dateAdded), "MMM d")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle section - Progress */}
                      <div className="flex-shrink-0 px-6 w-64">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-khan-gray-medium">Progress</span>
                            <span className="text-sm font-medium text-khan-gray-dark">{subject.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-khan-green h-2 rounded-full transition-all duration-300"
                              style={{ width: `${subject.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Right section - Badges and Actions */}
                      <div className="flex-shrink-0 flex items-center space-x-3">
                        <div className="flex flex-col space-y-2">
                          <Badge 
                            variant="outline" 
                            className={difficultyColors[subject.difficulty as keyof typeof difficultyColors]}
                          >
                            {subject.difficulty}
                          </Badge>
                          {subject.masteryLevel && (
                            <Badge 
                              variant="outline" 
                              className={
                                subject.masteryLevel === 3 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                subject.masteryLevel === 4 ? "bg-blue-100 text-blue-800 border-blue-200" :
                                "bg-green-100 text-green-800 border-green-200"
                              }
                            >
                              Goal: {subject.masteryLevel}
                            </Badge>
                          )}
                        </div>
                        
                        <Button 
                          onClick={() => handleStartStudying(subject.subjectId)}
                          className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold px-6"
                        >
                          Continue Studying
                        </Button>
                        
                        <button
                          onClick={() => removeSubject(subject.subjectId)}
                          className="text-khan-gray-light hover:text-khan-red transition-colors p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}