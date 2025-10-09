import { BookOpen } from "lucide-react";
import { Clock } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import Link from "next/link"; // Changed from wouter's Link
import { useRouter } from "next/router"; // Changed from wouter's useLocation
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import { apSubjects, difficultyColors } from "@/lib/ap-subjects";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, safeDateParse } from "@/lib/utils";

// Interface for a course, including optional isAdded status
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
  const router = useRouter(); // Changed from useLocation()
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Add subject to dashboard mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (subject: typeof apSubjects[0]) => {
      const response = await apiRequest("POST", "/api/user/subjects", {
        subjectId: subject.id,
        name: subject.name,
        description: subject.description,
        units: subject.units,
        difficulty: subject.difficulty,
        examDate: subject.examDate,
        progress: 0,
        masteryLevel: 4, // Default mastery level
      });
      return response.json();
    },
    onSuccess: (data, subject) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({
        title: "Subject added!",
        description: `${subject.name} has been added to your dashboard.`,
      });
      router.push('/dashboard');
    },
  });

  // Handle mutation errors with useEffect since onError is deprecated in v5
  useEffect(() => {
    if (addSubjectMutation.error && !addSubjectMutation.isPending) {
      const errorMessage = addSubjectMutation.error.message;
      if (errorMessage.includes("Subject already added")) {
        toast({
          title: "Already added",
          description: "This subject is already in your dashboard.",
          variant: "default"
        });
      } else if (errorMessage.includes("Invalid difficulty")) {
        toast({
          title: "Invalid difficulty",
          description: "The difficulty level provided is not valid. Please choose from Easy, Medium, or Hard.",
          variant: "destructive"
        });
      } else if (errorMessage.includes("Units exceed maximum")) {
        toast({
          title: "Too many units",
          description: "The number of units for this subject exceeds the allowed limit.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add subject. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [addSubjectMutation.error, addSubjectMutation.isPending, toast]);

  // Add subject to dashboard
  const handleAddToDashboard = (subject: typeof apSubjects[0]) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Map difficulty to accepted values
    let adjustedDifficulty: string = subject.difficulty;
    if (subject.difficulty === "Very Hard") {
      adjustedDifficulty = "Hard";
    }

    // Adjust units if it exceeds the limit
    let adjustedUnits = subject.units;
    if (subject.units > 8) {
      adjustedUnits = 8;
    }

    // Format examDate to YYYY-MM-DD with safe date handling
    let formattedExamDate: string;
    try {
      const parsedDate = safeDateParse(subject.examDate);
      if (parsedDate) {
        formattedExamDate = parsedDate.toISOString().split('T')[0];
      } else {
        console.error("Invalid date format for examDate:", subject.examDate);
        toast({
          title: "Invalid Date",
          description: `The exam date for ${subject.name} is invalid.`,
          variant: "destructive",
        });
        return;
      }
    } catch (e) {
      console.error("Error parsing date:", e);
      toast({
        title: "Date Parsing Error",
        description: `Could not parse the exam date for ${subject.name}.`,
        variant: "destructive",
      });
      return;
    }

    addSubjectMutation.mutate({
      ...subject,
      difficulty: adjustedDifficulty,
      units: adjustedUnits,
      examDate: formattedExamDate
    });
  };


  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
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

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
              Choose Your <span className="text-khan-green">AP Subject</span>
            </h1>
            <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
              Select an AP course to begin your personalized learning journey with practice tests and study materials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...apSubjects].sort((a, b) => a.name.localeCompare(b.name)).map((subject) => {
              const isActive = ['computer-science-principles', 'macroeconomics', 'microeconomics'].includes(subject.id);
              
              return (
                <Card key={subject.id} className={`bg-white transition-all border-2 ${isActive ? 'hover:shadow-md border-gray-100 hover:border-khan-green/30' : 'border-gray-200 opacity-75'}`}>
                  <CardHeader className="pb-4">
                    <div className="mb-2">
                      <CardTitle className="text-lg font-bold text-khan-gray-dark">
                        {subject.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-khan-gray-medium leading-relaxed text-sm">
                      {subject.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-khan-gray-medium mb-6">
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-khan-gray-dark font-medium">{subject.units} Units</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-khan-gray-dark font-medium">{formatDate(subject.examDate)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3">
                      {isActive ? (
                        <Button 
                          onClick={() => handleAddToDashboard(subject)}
                          className="w-full bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold"
                        >
                          Add to Dashboard
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      ) : (
                        <Button 
                          disabled
                          className="w-full bg-gray-400 text-white cursor-not-allowed font-semibold"
                        >
                          Coming Soon
                        </Button>
                      )}
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