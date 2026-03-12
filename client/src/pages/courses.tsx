import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Check, Search, Sparkles } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { apSubjects } from "@/lib/ap-subjects";
import { apiRequest } from "@/lib/api";
import { formatDate, safeDateParse } from "@/lib/date";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface Course {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  units: number;
  examDate: string | number | Date | { seconds: number } | null;
  isAdded?: boolean;
  dateAdded?: string | number | Date | { seconds: number } | null;
  lastStudied?: string | number | Date | { seconds: number } | null;
}

export default function Courses() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subjectsResponse } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/subjects");
      if (!response.ok) throw new Error("Failed to fetch subjects");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
  });

  const addedSubjectIds = new Set(
    (subjectsResponse?.data || []).map((s: any) => s.subjectId),
  );

  const archivedAddedSubjectIds = new Set(
    (subjectsResponse?.data || [])
      .filter((s: any) => s.archived === true)
      .map((s: any) => s.subjectId),
  );

  const addSubjectMutation = useMutation({
    mutationFn: async (subject: (typeof apSubjects)[0]) => {
      const response = await apiRequest("POST", "/api/user/subjects", {
        subjectId: subject.id,
        name: subject.name,
        description: subject.description,
        units: subject.units,
        difficulty: subject.difficulty,
        examDate: subject.examDate,
        progress: 0,
        masteryLevel: 4,
      });
      return response.json();
    },

    onSuccess: (data, subject) => {
      const created = data?.data;
      queryClient.setQueryData(["subjects"], (oldData: any) => {
        if (!oldData?.data) return oldData;
        return {
          ...oldData,
          data: created
            ? [...oldData.data, created]
            : [
                ...oldData.data,
                {
                  id: undefined,
                  subjectId: subject.id,
                  name: subject.name,
                  description: subject.description,
                  units: subject.units,
                  difficulty: subject.difficulty,
                  examDate: subject.examDate,
                  progress: 0,
                  masteryLevel: 4,
                },
              ],
        };
      });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });

      toast({
        title: "Subject added!",
        description: (
          <>
            {subject.name} has been added to your{" "}
            <Link href="/dashboard" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Dashboard
            </Link>
            .
          </>
        ),
      });
    },
  });

  useEffect(() => {
    if (addSubjectMutation.error && !addSubjectMutation.isPending) {
      const msg = addSubjectMutation.error.message;

      if (msg.includes("Subject already added")) {
        toast({
          title: "Already added",
          description: "This subject is already in your dashboard.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add subject. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [addSubjectMutation.error, addSubjectMutation.isPending, toast]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubjects = useMemo(() => {
    const sorted = [...apSubjects].sort((a, b) => a.name.localeCompare(b.name));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleAddToDashboard = (subject: (typeof apSubjects)[0]) => {
    if (!isAuthenticated) return router.push("/login");

    const adjustedDifficulty =
      subject.difficulty === "Very Hard" ? "Hard" : subject.difficulty;

    let formattedExamDate: string;
    try {
      const parsedDate = safeDateParse(subject.examDate);
      if (!parsedDate) throw new Error("Invalid exam date");
      formattedExamDate = parsedDate.toISOString().split("T")[0];
    } catch {
      toast({
        title: "Invalid Date",
        description: `The exam date for ${subject.name} is invalid.`,
        variant: "destructive",
      });
      return;
    }

    addSubjectMutation.mutate({
      ...subject,
      difficulty: adjustedDifficulty,
      examDate: formattedExamDate,
    });
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] relative overflow-hidden">

      <Navigation />

      <div className="py-5 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Courses</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">
              Choose Your <span className="text-gradient">AP Subject</span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-4">
              Add a course to your dashboard and start your personalized learning journey.
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AP subjects..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-150 ease-out"
              />
            </div>
          </div>

          {filteredSubjects.length === 0 && searchQuery.trim() && (
            <div className="text-center py-8 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-slate-500 dark:text-slate-400">
                No subjects match &quot;{searchQuery}&quot;. Try a different search term.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subject) => {
              const isAdded = addedSubjectIds.has(subject.id);
              const isAdding =
                addSubjectMutation.isPending &&
                addSubjectMutation.variables?.id === subject.id;

              return (
                <Card
                  key={subject.id}
                  className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 ease-out group"
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-lg font-display font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-150 ease-out">
                      {subject.name}
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">
                      {subject.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {subject.units} Units
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(subject.examDate)}
                        </span>
                      </div>
                    </div>

                    {isAdded ? (
                      <Button
                        disabled
                        className="w-full rounded-xl h-11 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800/50 font-semibold cursor-default"
                      >
                        <Check className="mr-2 w-4 h-4" />
                        {isAdding ? "Adding..." : archivedAddedSubjectIds.has(subject.id) ? "Added to Dashboard (Archived)" : "Added to Dashboard"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleAddToDashboard(subject)}
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl h-11 font-semibold shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Add to Dashboard
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <SimpleFooter />
    </div>
  );
}
