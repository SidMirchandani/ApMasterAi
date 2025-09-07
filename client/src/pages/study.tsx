import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Target, CheckCircle, PlayCircle, ArrowLeft } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apSubjects } from "@/lib/ap-subjects";

interface StudySubject {
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

interface Topic {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  completed: boolean;
  practiceQuestions: number;
}

interface Unit {
  id: string;
  title: string;
  description: string;
  topics: Topic[];
}

const calcSubjectTopics: Unit[] = [
  {
    id: "unit1",
    title: "Limits and Continuity",
    description: "Introduction to limits, one-sided limits, and continuity",
    topics: [
      {
        id: "limits-intro",
        title: "Introduction to Limits",
        description: "Understanding the concept of limits and limit notation",
        estimatedTime: "45 min",
        difficulty: "Beginner",
        completed: false,
        practiceQuestions: 15
      },
      {
        id: "limit-laws",
        title: "Limit Laws",
        description: "Properties and rules for evaluating limits",
        estimatedTime: "30 min", 
        difficulty: "Beginner",
        completed: false,
        practiceQuestions: 12
      },
      {
        id: "continuity",
        title: "Continuity",
        description: "Definition of continuity and types of discontinuities",
        estimatedTime: "40 min",
        difficulty: "Intermediate", 
        completed: false,
        practiceQuestions: 18
      }
    ]
  },
  {
    id: "unit2", 
    title: "Differentiation",
    description: "Derivatives and their applications",
    topics: [
      {
        id: "derivative-definition",
        title: "Definition of Derivative",
        description: "Understanding derivatives as rates of change",
        estimatedTime: "50 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 20
      },
      {
        id: "derivative-rules",
        title: "Derivative Rules",
        description: "Power rule, product rule, quotient rule, and chain rule",
        estimatedTime: "60 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 25
      },
      {
        id: "implicit-differentiation",
        title: "Implicit Differentiation",
        description: "Finding derivatives of implicitly defined functions",
        estimatedTime: "45 min",
        difficulty: "Advanced",
        completed: false,
        practiceQuestions: 16
      }
    ]
  },
  {
    id: "unit3",
    title: "Integration",
    description: "Antiderivatives and the Fundamental Theorem of Calculus",
    topics: [
      {
        id: "antiderivatives",
        title: "Antiderivatives",
        description: "Basic integration techniques and rules",
        estimatedTime: "55 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 22
      },
      {
        id: "fundamental-theorem",
        title: "Fundamental Theorem of Calculus", 
        description: "Connecting derivatives and integrals",
        estimatedTime: "50 min",
        difficulty: "Advanced",
        completed: false,
        practiceQuestions: 18
      },
      {
        id: "integration-techniques",
        title: "Integration Techniques",
        description: "Substitution and integration by parts",
        estimatedTime: "70 min",
        difficulty: "Advanced",
        completed: false,
        practiceQuestions: 28
      }
    ]
  }
];

const biologySubjectTopics: Unit[] = [
  {
    id: "unit1",
    title: "Chemistry of Life",
    description: "Basic chemistry concepts and biological molecules",
    topics: [
      {
        id: "water-properties",
        title: "Properties of Water",
        description: "Water's role in biological systems",
        estimatedTime: "40 min",
        difficulty: "Beginner",
        completed: false,
        practiceQuestions: 14
      },
      {
        id: "macromolecules",
        title: "Biological Macromolecules",
        description: "Carbohydrates, lipids, proteins, and nucleic acids",
        estimatedTime: "60 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 24
      }
    ]
  },
  {
    id: "unit2",
    title: "Cell Structure and Function",
    description: "Cell theory, organelles, and cellular processes",
    topics: [
      {
        id: "cell-theory",
        title: "Cell Theory",
        description: "Fundamental principles of cell biology",
        estimatedTime: "35 min",
        difficulty: "Beginner",
        completed: false,
        practiceQuestions: 12
      },
      {
        id: "organelles",
        title: "Cell Organelles",
        description: "Structure and function of cellular components",
        estimatedTime: "55 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 20
      }
    ]
  }
];

const getTopicsForSubject = (subjectId: string): Unit[] => {
  switch (subjectId) {
    case 'calculus-ab':
    case 'calculus-bc':
      return calcSubjectTopics;
    case 'biology':
      return biologySubjectTopics;
    default:
      return [
        {
          id: "general",
          title: "General Topics",
          description: "Core concepts and practice materials",
          topics: [
            {
              id: "fundamentals",
              title: "Fundamental Concepts",
              description: "Core principles and basic understanding",
              estimatedTime: "45 min",
              difficulty: "Beginner",
              completed: false,
              practiceQuestions: 15
            },
            {
              id: "intermediate-topics",
              title: "Intermediate Topics",
              description: "Building on the fundamentals",
              estimatedTime: "60 min",
              difficulty: "Intermediate", 
              completed: false,
              practiceQuestions: 20
            },
            {
              id: "advanced-applications",
              title: "Advanced Applications",
              description: "Complex problem solving and applications",
              estimatedTime: "75 min",
              difficulty: "Advanced",
              completed: false,
              practiceQuestions: 25
            }
          ]
        }
      ];
  }
};

const difficultyColors = {
  "Beginner": "bg-green-100 text-green-800 border-green-200",
  "Intermediate": "bg-yellow-100 text-yellow-800 border-yellow-200", 
  "Advanced": "bg-red-100 text-red-800 border-red-200"
};

export default function Study() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Get subject ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('subject');

  // Fetch user subjects to get the specific subject details
  const { data: subjectsResponse, isLoading: subjectsLoading } = useQuery<{success: boolean, data: StudySubject[]}>({
    queryKey: ["/api/user/subjects"],
    enabled: isAuthenticated && !!user,
  });

  const subjects = subjectsResponse?.data || [];
  const currentSubject = subjects.find(s => s.subjectId === subjectId);
  const topics = currentSubject ? getTopicsForSubject(currentSubject.subjectId) : [];

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!subjectId) {
      navigate('/dashboard');
    }
  }, [subjectId, navigate]);

  const handleStartTopic = (topicId: string) => {
    // Navigate to practice test or study material for this topic
    navigate(`/practice-test/${subjectId}?topic=${topicId}`);
  };

  const handleContinueStudying = () => {
    // Find the next incomplete topic or go to practice test
    const nextTopic = topics
      .flatMap(unit => unit.topics)
      .find(topic => !topic.completed);
    
    if (nextTopic) {
      handleStartTopic(nextTopic.id);
    } else {
      // If all topics are complete, go to practice test
      navigate(`/practice-test/${subjectId}`);
    }
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

  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Subject Not Found</h1>
            <p className="text-gray-600 mb-8">The requested subject was not found in your dashboard.</p>
            <Button onClick={() => navigate('/dashboard')} data-testid="button-back-to-dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTopics = topics.reduce((sum, unit) => sum + unit.topics.length, 0);
  const completedTopics = topics.reduce((sum, unit) => sum + unit.topics.filter(t => t.completed).length, 0);
  const overallProgress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-subject-name">
                {currentSubject.name}
              </h1>
              <p className="text-gray-600 mt-1" data-testid="text-subject-description">
                {currentSubject.description}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleContinueStudying} 
            size="lg"
            className="bg-khan-green hover:bg-khan-green/90"
            data-testid="button-continue-studying"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Continue Studying
          </Button>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-khan-green" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-khan-green" data-testid="text-progress-percentage">
                  {Math.round(overallProgress)}%
                </div>
                <div className="text-sm text-gray-600">Overall Progress</div>
                <Progress value={overallProgress} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="text-completed-topics">
                  {completedTopics}/{totalTopics}
                </div>
                <div className="text-sm text-gray-600">Topics Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600" data-testid="text-mastery-level">
                  {currentSubject.masteryLevel}
                </div>
                <div className="text-sm text-gray-600">Target Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600" data-testid="text-exam-date">
                  {currentSubject.examDate}
                </div>
                <div className="text-sm text-gray-600">Exam Date</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Units */}
        <div className="space-y-6">
          {topics.map((unit, unitIndex) => (
            <Card key={unit.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-khan-green" />
                  Unit {unitIndex + 1}: {unit.title}
                </CardTitle>
                <CardDescription>{unit.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {unit.topics.map((topic) => (
                    <Card key={topic.id} className="border-l-4 border-l-khan-green/20">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg" data-testid={`text-topic-${topic.id}`}>
                                {topic.title}
                              </h3>
                              {topic.completed && (
                                <CheckCircle className="h-5 w-5 text-green-500" data-testid={`icon-completed-${topic.id}`} />
                              )}
                              <Badge 
                                variant="outline" 
                                className={difficultyColors[topic.difficulty]}
                                data-testid={`badge-difficulty-${topic.id}`}
                              >
                                {topic.difficulty}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3" data-testid={`text-topic-description-${topic.id}`}>
                              {topic.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span data-testid={`text-estimated-time-${topic.id}`}>
                                  {topic.estimatedTime}
                                </span>
                              </div>
                              <div data-testid={`text-practice-questions-${topic.id}`}>
                                {topic.practiceQuestions} practice questions
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <Button 
                              onClick={() => handleStartTopic(topic.id)}
                              variant={topic.completed ? "outline" : "default"}
                              data-testid={`button-start-topic-${topic.id}`}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              {topic.completed ? "Review" : "Start"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            data-testid="button-back-to-dashboard-bottom"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button 
            onClick={handleContinueStudying}
            className="bg-khan-green hover:bg-khan-green/90"
            data-testid="button-continue-studying-bottom"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Continue Studying
          </Button>
        </div>
      </div>
    </div>
  );
}