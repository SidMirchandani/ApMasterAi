import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Target,
  CheckCircle,
  ArrowLeft,
  Trophy,
  HelpCircle,
  RotateCcw,
  Bookmark,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { apSubjects } from "@/lib/ap-subjects";
import { formatDate } from "@/lib/date";
import { useIsMobile } from "@/lib/hooks/useMobile";
import { getUnitsForSubject } from "@/subjects";

interface StudySubject {
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
  unitProgress?: {
    [unitId: string]: {
      status: string;
      highestScore: number;
      scores: number[];
    };
  };
}

interface Unit {
  id: string;
  title: string;
  description: string;
  examWeight: string;
  progress: number;
}



export default function Study() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject)
    ? rawSubject[0] || undefined
    : rawSubject || undefined;

  const {
    data: subjectsResponse,
    isLoading: subjectsLoading,
    refetch,
  } = useQuery<{
    success: boolean;
    data: StudySubject[];
  }>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/subjects");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const subjects: StudySubject[] = subjectsResponse?.data || [];
  const currentSubject: StudySubject | undefined = subjects.find(
    (s) => s.subjectId === subjectId,
  );
  const units = currentSubject
    ? getUnitsForSubject(currentSubject.subjectId)
    : [];

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!subjectId) {
      router.push("/dashboard");
    }
  }, [subjectId, router]);

  const getProgressLevel = (score: number, hasAttempted: boolean): string => {
    if (!hasAttempted) return "Not Started";
    if (score >= 80) return "Mastered";
    if (score >= 60) return "Proficient";
    return "In Progress";
  };

  const getUnitData = (unitId: string) => {
    const unitProgress = currentSubject?.unitProgress || {};
    return unitProgress[unitId];
  };

  const getProgressBadgeColor = (level: string): string => {
    switch (level) {
      case "Mastered":
        return "bg-green-600 text-white";
      case "Proficient":
        return "bg-blue-500 text-white";
      case "In Progress":
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const confirmDelete = prompt(
      `Type "DELETE" to confirm deletion of this course. This action is irreversible.`,
    );
    if (confirmDelete === "DELETE") {
      const secondConfirm = confirm(
        "Are you absolutely sure you want to permanently delete this course? This cannot be undone.",
      );
      if (secondConfirm) {
        try {
          await apiRequest("DELETE", `/api/user/subjects/${courseId}`);
          refetch();
          router.push("/dashboard");
        } catch (error) {
          console.error("Failed to delete course:", error);
          alert(
            "An error occurred while deleting the course. Please try again.",
          );
        }
      }
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    try {
      await apiRequest("PATCH", `/api/user/subjects/${courseId}`, {
        archived: true,
      });
      refetch();
    } catch (error) {
      console.error("Failed to archive course:", error);
      alert("An error occurred while archiving the course. Please try again.");
    }
  };

  if (loading || subjectsLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Subject Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The requested subject was not found in your dashboard.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const topicsMastered = units.filter((unit) => {
    const unitData = currentSubject.unitProgress?.[unit.id];
    const score = unitData?.highestScore || unitData?.mcqScore || 0;
    const hasAttempted =
      unitData && (unitData.scores?.length > 0 || unitData.mcqScore > 0);
    return getProgressLevel(score, hasAttempted) === "Mastered";
  }).length;
  const totalTopics = units.length;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />

      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push("/dashboard")}
                className="text-gray-500 hover:text-khan-green -ml-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black text-[#2d3b45] dark:text-gray-100 tracking-tight">
                  {currentSubject.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-lg leading-relaxed">
                  {currentSubject.description}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-khan-green/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-khan-green" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Mastery</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">
                    {topicsMastered}/{totalTopics}
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-khan-blue/10 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-khan-blue" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Exam Date</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">
                    {formatDate(currentSubject.examDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Button
            onClick={() => router.push(`/quiz?subject=${subjectId}&unit=full-length`)}
            className="md:col-span-2 bg-[#36b37e] hover:bg-[#2fa371] h-14 text-lg font-bold shadow-md hover:shadow-lg transition-all"
          >
            <BookOpen className="mr-3 h-6 w-6" />
            Take Full-Length Practice Test
          </Button>
          <Button
            onClick={() => router.push(`/analytics?subject=${subjectId}`)}
            variant="outline"
            className="h-14 border-2 border-gray-200 dark:border-gray-700 hover:border-khan-green text-gray-700 dark:text-gray-300 font-bold"
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            Detailed Analytics
          </Button>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Button
              onClick={() => router.push(`/review?subject=${subjectId}`)}
              variant="outline"
              className="h-14 md:h-14 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 text-gray-700 dark:text-gray-300 font-bold"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Review
            </Button>
            <Button
              onClick={() => router.push(`/bookmarks?subject=${subjectId}`)}
              variant="outline"
              className="h-14 md:h-14 border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-400 text-gray-700 dark:text-gray-300 font-bold"
            >
              <Bookmark className="mr-2 h-5 w-5 fill-current text-yellow-500" />
              Saved
            </Button>
          </div>
        </div>

        {/* Units Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#2d3b45] dark:text-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-khan-green flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              Course Content
            </h2>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
              <span>{totalTopics} Units Total</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {units.map((unit, index) => {
              const unitData = getUnitData(unit.id);
              const score = unitData?.highestScore || 0;
              const hasAttempted = unitData && unitData.scores?.length > 0;
              const level = getProgressLevel(score, hasAttempted);
              const isMastered = level === "Mastered";

              return (
                <Card
                  key={unit.id}
                  className="group border border-gray-200 dark:border-gray-800 dark:bg-gray-900/50 hover:border-khan-green dark:hover:border-khan-green transition-all duration-300 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex items-start gap-4">
                          <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl transition-colors ${
                            isMastered ? 'bg-khan-green text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-bold text-[#2d3b45] dark:text-gray-100">
                                {unit.title}
                              </h3>
                              {isMastered && (
                                <Badge className="bg-yellow-400 hover:bg-yellow-500 text-black font-black px-2 py-0 h-6 flex items-center gap-1 border-none shadow-sm">
                                  👑 Mastered
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm max-w-3xl">
                              {unit.description}
                            </p>
                            <div className="flex items-center gap-4 pt-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                Weight: {unit.examWeight}
                              </span>
                              {!isMastered && hasAttempted && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-khan-blue flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5" />
                                  Best Score: {score}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 pb-6 md:pb-0 md:w-64 flex items-center bg-gray-50/50 dark:bg-gray-800/30 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800">
                        <Button
                          onClick={() => router.push(`/quiz?subject=${subjectId}&unit=${unit.id}`)}
                          className="w-full bg-white dark:bg-gray-800 hover:bg-khan-green hover:text-white text-[#2d3b45] dark:text-gray-100 border-2 border-gray-200 dark:border-gray-700 hover:border-khan-green font-bold h-12 transition-all group-hover:shadow-md"
                        >
                          Practice Unit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}