import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Target,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apSubjects } from "@/lib/ap-subjects";
import { formatDate } from "@/lib/utils";

interface StudySubject {
  id: number;
  userId: number;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string | number | Date | { seconds: number } | null;
  progress: number;
  masteryLevel: number;
  lastStudied?: string | number | Date | { seconds: number } | null;
  dateAdded?: string | number | Date | { seconds: number } | null;
}

interface Unit {
  id: string;
  title: string;
  description: string;
  progress: number;
}

const macroeconomicsUnits: Unit[] = [
  {
    id: "unit1",
    title: "Basic Economic Concepts",
    description: "Scarcity, opportunity cost, production possibilities, comparative advantage, and economic systems",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Economic Indicators and the Business Cycle",
    description: "Circular flow, GDP, unemployment, price indices, and business cycles",
    progress: 0,
  },
  {
    id: "unit3",
    title: "National Income and Price Determination",
    description: "Aggregate demand and supply, multipliers, and fiscal policy",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Financial Sector",
    description: "Money, banking, monetary policy, and the loanable funds market",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Long-Run Consequences of Stabilization Policies",
    description: "Phillips curve, money growth, inflation, and fiscal/monetary policy",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Open Economy - International Trade and Finance",
    description: "Balance of payments, exchange rates, and trade policies",
    progress: 0,
  },
];

const calculusUnits: Unit[] = [
  {
    id: "unit1",
    title: "Limits and Continuity",
    description: "Introduction to limits, one-sided limits, and continuity",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Differentiation: Definition and Fundamental Properties",
    description: "Derivatives and their applications",
    progress: 0,
  },
  {
    id: "unit3",
    title: "Differentiation: Composite, Implicit, and Inverse Functions",
    description: "Chain rule, implicit differentiation, and inverse functions",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Contextual Applications of Differentiation",
    description: "Related rates, optimization, and curve sketching",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Analytical Applications of Differentiation",
    description: "Mean value theorem and L'Hôpital's rule",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Integration and Accumulation of Change",
    description: "Antiderivatives and the Fundamental Theorem of Calculus",
    progress: 0,
  },
  {
    id: "unit7",
    title: "Differential Equations",
    description: "Slope fields and separation of variables",
    progress: 0,
  },
  {
    id: "unit8",
    title: "Applications of Integration",
    description: "Area, volume, and average value",
    progress: 0,
  },
];

const biologyUnits: Unit[] = [
  {
    id: "unit1",
    title: "Chemistry of Life",
    description: "Basic chemistry concepts and biological molecules",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Cell Structure and Function",
    description: "Cell theory, organelles, and cellular processes",
    progress: 0,
  },
  {
    id: "unit3",
    title: "Cellular Energetics",
    description: "Photosynthesis and cellular respiration",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Cell Communication and Cell Cycle",
    description: "Cell signaling and the cell cycle",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Heredity",
    description: "Mendelian genetics and inheritance patterns",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Gene Expression and Regulation",
    description: "DNA structure, replication, and gene regulation",
    progress: 0,
  },
  {
    id: "unit7",
    title: "Natural Selection",
    description: "Evolution and natural selection",
    progress: 0,
  },
  {
    id: "unit8",
    title: "Ecology",
    description: "Population dynamics, communities, and ecosystems",
    progress: 0,
  },
];

const getUnitsForSubject = (subjectId: string): Unit[] => {
  switch (subjectId) {
    case "macroeconomics":
      return macroeconomicsUnits;
    case "calculus-ab":
    case "calculus-bc":
      return calculusUnits;
    case "biology":
      return biologyUnits;
    default:
      return [
        {
          id: "unit1",
          title: "Core Concepts",
          description: "Fundamental concepts and principles",
          progress: 0,
        },
      ];
  }
};

export default function Study() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject)
    ? (rawSubject[0] || undefined)
    : (rawSubject || undefined);

  const { data: subjectsResponse, isLoading: subjectsLoading } = useQuery<{
    success: boolean;
    data: StudySubject[];
  }>({
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
  const currentSubject: StudySubject | undefined = subjects.find(
    (s) => s.subjectId === subjectId
  );
  const units = currentSubject ? getUnitsForSubject(currentSubject.subjectId) : [];

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!subjectId) {
      router.push("/dashboard");
    }
  }, [subjectId, router]);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Subject Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The requested subject was not found in your dashboard.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const topicsMastered = 0; // Will be calculated based on actual progress
  const totalTopics = units.length;

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="p-2"
              data-testid="button-back"
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
        </div>

        {/* Your Learning Journey */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-khan-green" />
              Your Learning Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {topicsMastered}/{totalTopics}
                </div>
                <div className="text-sm text-gray-600 mt-1">Topics Mastered</div>
                <div className="flex justify-center mt-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">4</div>
                <div className="text-sm text-gray-600 mt-1">Expected Score</div>
                <div className="flex justify-center mt-2">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {formatDate(currentSubject.examDate)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Exam Date</div>
                <div className="flex justify-center mt-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Practice Test Buttons */}
            <div className="mt-8 flex flex-col gap-3 max-w-md mx-auto">
              <Button
                onClick={() => router.push(`/practice-test/${subjectId}?type=mcq`)}
                className="bg-khan-green hover:bg-khan-green/90 w-full h-12"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Full AP Practice Test
              </Button>
              <Button
                onClick={() => router.push(`/practice-test/${subjectId}?type=frq`)}
                className="bg-khan-blue hover:bg-khan-blue/90 w-full h-12"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Full AP FRQ Practice Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Study Units */}
        <div className="space-y-6">
          {units.map((unit, index) => (
            <div key={unit.id}>
              <Card className="border-l-4 border-l-khan-green">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-khan-green text-white flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {unit.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {unit.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={unit.progress} className="flex-1 max-w-xs" />
                          <span className="text-sm font-medium text-gray-700">
                            {unit.progress}% Complete
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unit Practice Test Buttons */}
              <div className="mt-3 flex gap-3 ml-14">
                <Button
                  onClick={() => router.push(`/practice-test/${subjectId}?unit=${unit.id}&type=mcq`)}
                  variant="outline"
                  className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Unit MCQ Practice Test
                </Button>
                <Button
                  onClick={() => router.push(`/practice-test/${subjectId}?unit=${unit.id}&type=frq`)}
                  variant="outline"
                  className="border-2 border-khan-blue text-khan-blue hover:bg-khan-blue hover:text-white"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Unit FRQ Practice Test
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            data-testid="button-back-to-dashboard-bottom"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}