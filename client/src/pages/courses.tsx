import { BookOpen } from "lucide-react";
import { Clock } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Target } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


const masteryLevels = [
  {
    level: 3,
    title: "Pass (3)",
    description: "I want to pass the AP exam and earn college credit",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200"
  },
  {
    level: 4,
    title: "Well Qualified (4)", 
    description: "I want to demonstrate strong understanding and skills",
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    level: 5,
    title: "Extremely Well Qualified (5)",
    description: "I want to achieve the highest possible score",
    color: "bg-green-100 text-green-800 border-green-200"
  }
];

// Interface for a course, including optional isAdded status
interface Course {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  units: number;
  examDate: string;
  isAdded?: boolean;
}

export default function Courses() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter(); // Changed from useLocation()
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMasteryModal, setShowMasteryModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<typeof apSubjects[0] | null>(null);
  const [selectedMastery, setSelectedMastery] = useState<string>("4");

  // Add subject to dashboard mutation
  const addSubjectMutation = useMutation({
    mutationFn: async ({ subject, masteryLevel }: { subject: typeof apSubjects[0]; masteryLevel: string }) => {
      const response = await apiRequest("POST", "/api/user/subjects", {
        subjectId: subject.id,
        name: subject.name,
        description: subject.description,
        units: subject.units,
        difficulty: subject.difficulty,
        examDate: subject.examDate,
        progress: 0,
        masteryLevel: parseInt(masteryLevel),
      });
      return response.json();
    },
    onSuccess: (data, { subject }) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({
        title: "Subject added!",
        description: `${subject.name} has been added to your dashboard.`,
      });
      setShowMasteryModal(false);
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

    setSelectedSubject(subject);
    setShowMasteryModal(true);
  };

  const handleConfirmAddSubject = () => {
    if (!selectedSubject) return;

    // Map difficulty to accepted values
    let adjustedDifficulty: string = selectedSubject.difficulty;
    if (selectedSubject.difficulty === "Very Hard") {
      adjustedDifficulty = "Hard";
    }

    // Adjust units if it exceeds the limit
    let adjustedUnits = selectedSubject.units;
    if (selectedSubject.units > 8) {
      adjustedUnits = 8;
    }

    // Format examDate to YYYY-MM-DD with safe date handling
    let formattedExamDate: string = selectedSubject.examDate;
    try {
      const dateValue = selectedSubject.examDate;
      let date: Date;
      
      if (typeof dateValue === 'object' && dateValue !== null && !Array.isArray(dateValue) && 'seconds' in dateValue) {
        // Firestore Timestamp
        date = new Date((dateValue as any).seconds * 1000);
      } else if (dateValue && Object.prototype.toString.call(dateValue) === '[object Date]') {
        // Regular Date object using safe runtime check
        date = dateValue as unknown as Date;
      } else {
        // String or other format
        date = new Date(dateValue as string);
      }
      
      if (!isNaN(date.getTime())) {
        formattedExamDate = date.toISOString().split('T')[0];
      } else {
        console.error("Invalid date format for examDate:", selectedSubject.examDate);
        toast({
          title: "Invalid Date",
          description: `The exam date for ${selectedSubject.name} is invalid.`,
          variant: "destructive",
        });
        return;
      }
    } catch (e) {
      console.error("Error parsing date:", e);
      toast({
        title: "Date Parsing Error",
        description: `Could not parse the exam date for ${selectedSubject.name}.`,
        variant: "destructive",
      });
      return;
    }


    addSubjectMutation.mutate({ 
      subject: {
        ...selectedSubject,
        difficulty: adjustedDifficulty,
        units: adjustedUnits,
        examDate: formattedExamDate
      }, 
      masteryLevel: selectedMastery 
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
            {apSubjects.map((subject) => (
              <Card key={subject.id} className="bg-white hover:shadow-md transition-all border-2 border-gray-100 hover:border-khan-green/30">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg font-bold text-khan-gray-dark">
                      {subject.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={difficultyColors[subject.difficulty as keyof typeof difficultyColors]}
                    >
                      {subject.difficulty}
                    </Badge>
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
                      <span className="text-khan-gray-dark font-medium">{subject.examDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <Button 
                      onClick={() => handleAddToDashboard(subject)}
                      className="w-full bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold"
                    >
                      Add to Dashboard
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>


        </div>
      </div>

      {/* Mastery Level Selection Modal */}
      <Dialog open={showMasteryModal} onOpenChange={setShowMasteryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="w-6 h-6 text-khan-green" />
              <span>What's your AP goal?</span>
            </DialogTitle>
            <DialogDescription>
              Choose the score you're aiming for in {selectedSubject?.name}. This helps us customize your study plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup 
              value={selectedMastery} 
              onValueChange={setSelectedMastery}
              className="space-y-3"
            >
              {masteryLevels.map((level) => (
                <div key={level.level} className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value={level.level.toString()} 
                    id={level.level.toString()}
                    className="mt-1"
                    data-testid={`mastery-level-${level.level}`}
                  />
                  <Label 
                    htmlFor={level.level.toString()} 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={level.color}>
                        Score {level.level}
                      </Badge>
                      <span className="font-semibold text-khan-gray-dark">
                        {level.title}
                      </span>
                    </div>
                    <p className="text-sm text-khan-gray-medium leading-relaxed">
                      {level.description}
                    </p>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowMasteryModal(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmAddSubject}
                disabled={addSubjectMutation.isPending}
                className="bg-khan-green text-white hover:bg-khan-green-light"
                data-testid="button-add-subject"
              >
                {addSubjectMutation.isPending ? "Adding..." : "Add Subject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}