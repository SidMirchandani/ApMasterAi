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
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import { apSubjects, difficultyColors } from "@/lib/ap-subjects";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";


export default function Courses() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
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
      });
      return response.json();
    },
    onSuccess: (data, subject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subjects"] });
      toast({
        title: "Subject added!",
        description: `${subject.name} has been added to your dashboard.`,
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    },
    onError: (error: any) => {
      const errorMessage = error.message;
      if (errorMessage.includes("Subject already added")) {
        toast({
          title: "Already added",
          description: "This subject is already in your dashboard.",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add subject. Please try again.",
          variant: "destructive"
        });
      }
    },
  });

  // Add subject to dashboard
  const handleAddToDashboard = (subject: typeof apSubjects[0]) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    addSubjectMutation.mutate(subject);
  };


  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

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
                      className="bg-khan-green text-white hover:bg-khan-green-light transition-colors w-full font-semibold"
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
    </div>
  );
}