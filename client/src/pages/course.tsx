import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Target, Users, Plus } from "lucide-react";
import { getSubjectByLegacyId, getLegacyIdForSubjectCode } from "@/subjects";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Course() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  const handleAddCourse = async () => {
    if (!id || typeof id !== "string") return;

    setIsAdding(true);
    try {
      const subject = getSubjectByLegacyId(id);
      if (!subject) {
        toast({
          title: "Error",
          description: "Subject not found",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest("POST", "/api/user/subjects", {
        subjectId: subject.subjectCode,
        name: subject.displayName,
        description: subject.metadata.description,
        units: subject.units.length,
        examDate: subject.metadata.examDate,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${subject.displayName} added to your dashboard!`,
        });
        router.push("/dashboard");
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to add course",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add course",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

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

  // Get course name from the ID (expand later with actual data)
  const getCourseName = (courseId: string) => {
    const courseMap: Record<string, string> = {
      "calculus-ab": "AP Calculus AB",
      "calculus-bc": "AP Calculus BC",
      biology: "AP Biology",
      chemistry: "AP Chemistry",
      "physics-1": "AP Physics 1",
      "us-history": "AP U.S. History",
      "world-history": "AP World History",
      "english-language": "AP English Language",
      "english-literature": "AP English Literature",
      psychology: "AP Psychology",
    };
    return courseMap[courseId] || "AP Course";
  };

  // ✅ Normalize id into a string
  const courseId: string = Array.isArray(id) ? (id[0] || "") : (id || "");
  const courseName: string = getCourseName(courseId);

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
              {courseName}
            </h1>
            <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
              Master the concepts and skills you need to succeed on your AP
              exam.
            </p>
          </div>

          <div className="bg-white rounded-lg border-2 border-gray-100 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-khan-blue rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-khan-gray-dark mb-2">
                  Practice Questions
                </h3>
                <p className="text-khan-gray-medium">
                  Real AP-style problems and solutions
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-khan-green rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-khan-gray-dark mb-2">
                  Detailed Explanations
                </h3>
                <p className="text-khan-gray-medium">
                  Comprehensive answer explanations
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-khan-purple rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-khan-gray-dark mb-2">
                  Timed Practice
                </h3>
                <p className="text-khan-gray-medium">
                  Exam simulation with real timing
                </p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">
                Ready to Start Studying?
              </h2>
              <p className="text-khan-gray-medium mb-6">
                Add {courseName} to your dashboard and start practicing with real AP-style questions.
              </p>
              <Button
                onClick={handleAddCourse}
                disabled={isAdding}
                className="bg-khan-green text-white hover:bg-khan-green/90 px-8 py-3 text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {isAdding ? "Adding..." : "Add to Dashboard"}
              </Button>
              <div className="flex items-center justify-center space-x-2 text-khan-green mt-6">
                <Users className="w-5 h-5" />
                <span className="font-medium">
                  Join thousands of students preparing for success
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}