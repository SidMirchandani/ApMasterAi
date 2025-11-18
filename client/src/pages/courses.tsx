import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Check } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { apSubjects } from "@/lib/ap-subjects";
import { apiRequest } from "@/lib/api";
import { formatDate, safeDateParse } from "@/lib/date";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

// ---------------------------------------------------
// TYPES
// ---------------------------------------------------

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

// ---------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------

export default function Courses() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---------------------------------------------------
  // FETCH ADDED SUBJECTS
  // ---------------------------------------------------

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
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  const addedSubjectIds = new Set(
    (subjectsResponse?.data || []).map((s: any) => s.subjectId),
  );

  // ---------------------------------------------------
  // ADD SUBJECT MUTATION
  // ---------------------------------------------------

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
      // Optimistic cache update
      queryClient.setQueryData(["subjects"], (oldData: any) => {
        if (!oldData?.data) return oldData;
        return {
          ...oldData,
          data: [
            ...oldData.data,
            {
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
        description: `${subject.name} has been added to your dashboard.`,
      });
    },
  });

  // Better error messaging
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

  // ---------------------------------------------------
  // HANDLE ADD CLICK
  // ---------------------------------------------------

  const handleAddToDashboard = (subject: (typeof apSubjects)[0]) => {
    if (!isAuthenticated) return router.push("/login");

    // Normalize difficulty: "Very Hard" → "Hard"
    const adjustedDifficulty =
      subject.difficulty === "Very Hard" ? "Hard" : subject.difficulty;

    // Parse exam date safely
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

  // ---------------------------------------------------
  // AUTH REDIRECT
  // ---------------------------------------------------

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-khan-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-khan-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-khan-gray-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-khan-background via-white to-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-khan-green/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-khan-blue/5 rounded-full blur-3xl"></div>
      </div>

      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
              Choose Your <span className="text-khan-green">AP Subject</span>
            </h1>
            <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
              Select an AP course to begin your personalized learning journey.
            </p>
          </div>

          {/* Subject Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...apSubjects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subject) => {
                const isAdded = addedSubjectIds.has(subject.id);
                const isAdding =
                  addSubjectMutation.isPending &&
                  addSubjectMutation.variables?.id === subject.id;

                return (
                  <Card
                    key={subject.id}
                    className="bg-white border-2 border-gray-100 hover:border-khan-green/30 hover:shadow-md transition-all"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-bold text-khan-gray-dark">
                        {subject.name}
                      </CardTitle>
                      <CardDescription className="text-khan-gray-medium text-sm leading-relaxed">
                        {subject.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {/* Metadata */}
                      <div className="flex items-center justify-between text-sm text-khan-gray-medium mb-6">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-khan-gray-dark font-medium">
                            {subject.units} Units
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-khan-gray-dark font-medium">
                            {formatDate(subject.examDate)}
                          </span>
                        </div>
                      </div>

                      {/* ACTION BUTTON */}
                      {isAdded ? (
                        <Button
                          disabled
                          className="w-full bg-green-100 text-green-700 border-2 border-green-200 cursor-not-allowed font-semibold"
                        >
                          <Check className="mr-2 w-4 h-4" />
                          {isAdding ? "Adding..." : "Added to Dashboard"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAddToDashboard(subject)}
                          className="w-full bg-khan-green text-white hover:bg-khan-green-light font-semibold transition-colors"
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
    </div>
  );
}
