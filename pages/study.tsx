
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Target, CheckCircle, PlayCircle, ArrowLeft, Award, Users, Brain, Zap } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  lastStudied?: string | null | Date | { seconds: number };
  dateAdded: string | null | Date | { seconds: number };
}

interface Topic {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  completed: boolean;
  practiceQuestions: number;
  videoLessons: number;
  articles: number;
  exercises: number;
}

interface Unit {
  id: string;
  title: string;
  description: string;
  topics: Topic[];
  progress: number;
}

const calcSubjectTopics: Unit[] = [
  {
    id: "unit1",
    title: "Limits and Continuity",
    description: "Introduction to limits, one-sided limits, and continuity",
    progress: 65,
    topics: [
      {
        id: "limits-intro",
        title: "Introduction to Limits",
        description: "Understanding the concept of limits and limit notation",
        estimatedTime: "45 min",
        difficulty: "Beginner",
        completed: true,
        practiceQuestions: 15,
        videoLessons: 3,
        articles: 2,
        exercises: 8
      },
      {
        id: "limit-laws",
        title: "Limit Laws",
        description: "Properties and rules for evaluating limits",
        estimatedTime: "30 min",
        difficulty: "Beginner", 
        completed: true,
        practiceQuestions: 12,
        videoLessons: 2,
        articles: 1,
        exercises: 6
      },
      {
        id: "continuity",
        title: "Continuity",
        description: "Definition of continuity and types of discontinuities",
        estimatedTime: "40 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 18,
        videoLessons: 4,
        articles: 3,
        exercises: 10
      }
    ]
  },
  {
    id: "unit2",
    title: "Differentiation",
    description: "Derivatives and their applications",
    progress: 20,
    topics: [
      {
        id: "derivative-definition",
        title: "Definition of Derivative",
        description: "Understanding derivatives as rates of change",
        estimatedTime: "50 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 20,
        videoLessons: 5,
        articles: 2,
        exercises: 12
      },
      {
        id: "derivative-rules",
        title: "Derivative Rules",
        description: "Power rule, product rule, quotient rule, and chain rule",
        estimatedTime: "60 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 25,
        videoLessons: 6,
        articles: 4,
        exercises: 15
      }
    ]
  },
  {
    id: "unit3",
    title: "Integration",
    description: "Antiderivatives and the Fundamental Theorem of Calculus",
    progress: 0,
    topics: [
      {
        id: "antiderivatives",
        title: "Antiderivatives",
        description: "Basic integration techniques and rules",
        estimatedTime: "55 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 22,
        videoLessons: 4,
        articles: 3,
        exercises: 14
      },
      {
        id: "fundamental-theorem",
        title: "Fundamental Theorem of Calculus",
        description: "Connecting derivatives and integrals",
        estimatedTime: "50 min",
        difficulty: "Advanced",
        completed: false,
        practiceQuestions: 18,
        videoLessons: 3,
        articles: 2,
        exercises: 11
      }
    ]
  }
];

const biologySubjectTopics: Unit[] = [
  {
    id: "unit1",
    title: "Chemistry of Life",
    description: "Basic chemistry concepts and biological molecules",
    progress: 40,
    topics: [
      {
        id: "water-properties",
        title: "Properties of Water",
        description: "Water's role in biological systems",
        estimatedTime: "40 min",
        difficulty: "Beginner",
        completed: true,
        practiceQuestions: 14,
        videoLessons: 3,
        articles: 2,
        exercises: 7
      },
      {
        id: "macromolecules",
        title: "Biological Macromolecules",
        description: "Carbohydrates, lipids, proteins, and nucleic acids",
        estimatedTime: "60 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 24,
        videoLessons: 5,
        articles: 4,
        exercises: 12
      }
    ]
  },
  {
    id: "unit2",
    title: "Cell Structure and Function",
    description: "Cell theory, organelles, and cellular processes",
    progress: 0,
    topics: [
      {
        id: "cell-theory",
        title: "Cell Theory",
        description: "Fundamental principles of cell biology",
        estimatedTime: "35 min",
        difficulty: "Beginner",
        completed: false,
        practiceQuestions: 12,
        videoLessons: 2,
        articles: 2,
        exercises: 6
      },
      {
        id: "organelles",
        title: "Cell Organelles", 
        description: "Structure and function of cellular components",
        estimatedTime: "55 min",
        difficulty: "Intermediate",
        completed: false,
        practiceQuestions: 20,
        videoLessons: 4,
        articles: 3,
        exercises: 10
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
          progress: 33,
          topics: [
            {
              id: "fundamentals",
              title: "Fundamental Concepts",
              description: "Core principles and basic understanding",
              estimatedTime: "45 min",
              difficulty: "Beginner",
              completed: false,
              practiceQuestions: 15,
              videoLessons: 3,
              articles: 2,
              exercises: 8
            }
          ]
        }
      ];
  }
};

const difficultyColors: Record<string, string> = {
  "Beginner": "bg-green-100 text-green-800 border-green-200",
  "Intermediate": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Advanced": "bg-red-100 text-red-800 border-red-200"
};

export default function Study() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Get subject ID from URL params  
  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject) ? (rawSubject[0] || undefined) : (rawSubject || undefined);

  // Fetch user subjects to get the specific subject details
  const { data: subjectsResponse, isLoading: subjectsLoading } = useQuery<{success: boolean, data: StudySubject[]}>({
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
  const currentSubject: StudySubject | undefined = subjects.find(s => s.subjectId === subjectId);
  const units: Unit[] = currentSubject ? getTopicsForSubject(currentSubject.subjectId) : [];

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!subjectId) {
      router.push('/dashboard');
    }
  }, [subjectId, router]);

  const handleStartTopic = (topicId: string) => {
    // Navigate to practice test or study material for this topic
    router.push(`/practice-test/${subjectId}?topic=${topicId}`);
  };

  const handleContinueStudying = () => {
    // Find the next incomplete topic or go to practice test
    const nextTopic = units
      .flatMap(unit => unit.topics)
      .find(topic => !topic.completed);

    if (nextTopic) {
      handleStartTopic(nextTopic.id);
    } else {
      // If all topics are complete, go to practice test
      router.push(`/practice-test/${subjectId}`);
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
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTopics = units.reduce((sum, unit) => sum + unit.topics.length, 0);
  const completedTopics = units.reduce((sum, unit) => sum + unit.topics.filter(t => t.completed).length, 0);
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
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-khan-green/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentSubject.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentSubject.description}
              </p>
            </div>
          </div>
          <Button
            onClick={handleContinueStudying}
            size="lg"
            className="bg-khan-green hover:bg-khan-green/90 text-white"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Continue Studying
          </Button>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8 bg-gradient-to-r from-khan-green/5 to-khan-blue/5 border-2 border-khan-green/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-6 w-6 text-khan-green" />
              Your Learning Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-khan-green mb-2">
                  {Math.round(overallProgress)}%
                </div>
                <div className="text-sm text-gray-600 mb-3">Overall Progress</div>
                <Progress value={overallProgress} className="h-3" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {completedTopics}/{totalTopics}
                </div>
                <div className="text-sm text-gray-600 mb-3">Topics Mastered</div>
                <div className="flex items-center justify-center">
                  <Award className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {currentSubject.masteryLevel}
                </div>
                <div className="text-sm text-gray-600 mb-3">Target Score</div>
                <div className="flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {currentSubject ? new Date(currentSubject.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 mb-3">Exam Date</div>
                <div className="flex items-center justify-center">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Units - Khan Academy Style */}
        <div className="space-y-6">
          {units.map((unit, unitIndex) => (
            <Card key={unit.id} className="overflow-hidden border-2 border-gray-100 hover:border-khan-green/30 transition-all">
              <CardHeader className="bg-gradient-to-r from-khan-green/10 to-transparent border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="w-8 h-8 bg-khan-green rounded-full flex items-center justify-center text-white font-bold">
                        {unitIndex + 1}
                      </div>
                      {unit.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {unit.description}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-khan-green">
                      {Math.round(unit.progress)}%
                    </div>
                    <div className="text-sm text-gray-500">Complete</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={unit.progress} className="h-2" />
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {unit.topics.map((topic, topicIndex) => (
                    <div key={topic.id} className="group">
                      <div className="flex items-center p-4 rounded-lg border-2 border-gray-100 hover:border-khan-green/30 hover:bg-khan-green/5 transition-all cursor-pointer"
                           onClick={() => handleStartTopic(topic.id)}>
                        <div className="flex-shrink-0 mr-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            topic.completed 
                              ? 'bg-khan-green text-white' 
                              : 'bg-gray-200 text-gray-600 group-hover:bg-khan-green/20 group-hover:text-khan-green'
                          }`}>
                            {topic.completed ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <span className="font-semibold">{topicIndex + 1}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-khan-green transition-colors">
                              {topic.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={difficultyColors[topic.difficulty]}
                              >
                                {topic.difficulty}
                              </Badge>
                              {topic.completed && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Mastered
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-600 mb-3 leading-relaxed">
                            {topic.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{topic.estimatedTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <PlayCircle className="h-4 w-4" />
                                <span>{topic.videoLessons} videos</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                <span>{topic.articles} articles</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Brain className="h-4 w-4" />
                                <span>{topic.exercises} exercises</span>
                              </div>
                            </div>
                            
                            <Button
                              variant={topic.completed ? "outline" : "default"}
                              size="sm"
                              className={topic.completed ? 
                                "border-khan-green text-khan-green hover:bg-khan-green hover:text-white" : 
                                "bg-khan-green hover:bg-khan-green/90 text-white"
                              }
                            >
                              {topic.completed ? (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Review
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Start
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-12 bg-white rounded-lg border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-khan-green/10 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-khan-green" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Keep up the momentum!</h3>
                <p className="text-gray-600">You're making great progress. Continue to your next lesson.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="border-2 border-gray-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button
                onClick={handleContinueStudying}
                size="lg"
                className="bg-khan-green hover:bg-khan-green/90 text-white px-8"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Continue Learning
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
