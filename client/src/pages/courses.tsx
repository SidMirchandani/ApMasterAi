import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Check, Search } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0B0F1A]">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-11 w-11">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const totalCount = apSubjects.length;

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <header className="mb-8 md:mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-blue-600/90 dark:text-blue-400/90">Courses</p>
              <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Choose your AP subject
              </h1>
              <p className="max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                Add a course to your dashboard and start your personalized learning journey.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2 sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                asChild
              >
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                All subjects
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchQuery.trim()
                  ? `${filteredSubjects.length} match${filteredSubjects.length !== 1 ? "es" : ""} · ${totalCount} total`
                  : `${totalCount} course${totalCount !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[280px] sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses…"
                className="h-11 w-full rounded-full border-0 bg-slate-900/[0.04] pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {filteredSubjects.length === 0 && searchQuery.trim() && (
            <div className="rounded-3xl bg-slate-100 py-10 text-center dark:bg-white/[0.06]">
              <p className="text-slate-600 dark:text-slate-400">
                No subjects match &quot;{searchQuery}&quot;. Try a different search term.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => {
              const isAdded = addedSubjectIds.has(subject.id);
              const isAdding =
                addSubjectMutation.isPending &&
                addSubjectMutation.variables?.id === subject.id;

              return (
                <article
                  key={subject.id}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-slate-100 transition-colors duration-200 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
                    <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      {subject.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {subject.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 shrink-0 text-blue-600 opacity-80 dark:text-blue-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{subject.units} units</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0 text-blue-600 opacity-80 dark:text-blue-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(subject.examDate)}
                        </span>
                      </span>
                    </div>

                    <div className="mt-4">
                      {isAdded ? (
                        <Button
                          disabled
                          variant="ghost"
                          className="h-11 w-full cursor-default rounded-full bg-white/80 font-semibold text-blue-700 hover:bg-white/80 hover:text-blue-700 dark:bg-white/[0.08] dark:text-blue-400 dark:hover:bg-white/[0.08] dark:hover:text-blue-400"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {isAdding
                            ? "Adding…"
                            : archivedAddedSubjectIds.has(subject.id)
                              ? "Added (archived)"
                              : "Added to dashboard"}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => handleAddToDashboard(subject)}
                          className="h-11 w-full rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          Add to dashboard
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      <SimpleFooter />
    </div>
  );
}
