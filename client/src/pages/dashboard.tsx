import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trash2, Plus, Calendar } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch user subjects from API
  const { data: subjectsResponse, isLoading: subjectsLoading } = useQuery<{success: boolean, data: DashboardSubject[]}>({
    queryKey: ["/api/user/subjects"],
    enabled: isAuthenticated && !!user,
  });
  
  const subjects = subjectsResponse?.data || [];

  // Remove subject mutation
  const removeSubjectMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      await apiRequest("DELETE", `/api/user/subjects/${subjectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subjects"] });
    },
  });

  useEffect(() => {
    console.log('Dashboard auth state:', { loading, isAuthenticated, user: !!user });
    if (!loading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const removeSubject = (subjectId: string) => {
    removeSubjectMutation.mutate(subjectId);
  };

  const handleStartStudying = (subjectId: string) => {
    // Navigate to study page with subject ID
    navigate(`/study?subject=${subjectId}`);
  };

  if (loading || subjectsLoading) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
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
                onClick={() => navigate('/courses')}
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
                  onClick={() => navigate('/courses')}
                  variant="outline"
                  className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white transition-colors font-semibold"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add Subject
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject: DashboardSubject) => (
                  <Card key={subject.id} className="bg-white hover:shadow-md transition-all border-2 border-gray-100">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg font-bold text-khan-gray-dark">
                          {subject.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
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
                          <button
                            onClick={() => removeSubject(subject.subjectId)}
                            className="text-khan-gray-light hover:text-khan-red transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-khan-gray-medium text-sm leading-relaxed">
                        {subject.description}
                      </p>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1 text-khan-gray-medium">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-khan-gray-dark font-medium">{subject.units} Units</span>
                          </div>
                          <div className="flex items-center space-x-1 text-khan-gray-medium">
                            <Clock className="w-4 h-4" />
                            <span className="text-khan-gray-dark font-medium">{subject.examDate}</span>
                          </div>
                        </div>
                        
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
                        
                        <div className="flex items-center space-x-1 text-xs text-khan-gray-medium">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Added {format(new Date(subject.dateAdded), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        
                        <Button 
                          onClick={() => handleStartStudying(subject.subjectId)}
                          className="bg-khan-green text-white hover:bg-khan-green-light transition-colors w-full font-semibold"
                        >
                          Continue Studying
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}