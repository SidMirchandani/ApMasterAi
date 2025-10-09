
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
  examWeight: string;
  progress: number;
}

const macroeconomicsUnits: Unit[] = [
  {
    id: "unit1",
    title: "Basic Economic Concepts",
    description:
      "Scarcity, opportunity cost, production possibilities, comparative advantage, and economic systems",
    examWeight: "5-10%",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Economic Indicators and the Business Cycle",
    description:
      "Circular flow, GDP, unemployment, price indices, and business cycles",
    examWeight: "12-17%",
    progress: 0,
  },
  {
    id: "unit3",
    title: "National Income and Price Determination",
    description: "Aggregate demand and supply, multipliers, and fiscal policy",
    examWeight: "17-27%",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Financial Sector",
    description:
      "Money, banking, monetary policy, and the loanable funds market",
    examWeight: "18-23%",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Long-Run Consequences of Stabilization Policies",
    description:
      "Phillips curve, money growth, inflation, and fiscal/monetary policy",
    examWeight: "20-30%",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Open Economy - International Trade and Finance",
    description: "Balance of payments, exchange rates, and trade policies",
    examWeight: "10-13%",
    progress: 0,
  },
];

const calculusUnits: Unit[] = [
  {
    id: "unit1",
    title: "Limits and Continuity",
    description: "Introduction to limits, one-sided limits, and continuity",
    examWeight: "10-12%",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Differentiation: Definition and Fundamental Properties",
    description: "Derivatives and their applications",
    examWeight: "10-12%",
    progress: 0,
  },
  {
    id: "unit3",
    title: "Differentiation: Composite, Implicit, and Inverse Functions",
    description: "Chain rule, implicit differentiation, and inverse functions",
    examWeight: "9-13%",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Contextual Applications of Differentiation",
    description: "Related rates, optimization, and curve sketching",
    examWeight: "10-15%",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Analytical Applications of Differentiation",
    description: "Mean value theorem and L'Hôpital's rule",
    examWeight: "15-18%",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Integration and Accumulation of Change",
    description: "Antiderivatives and the Fundamental Theorem of Calculus",
    examWeight: "17-20%",
    progress: 0,
  },
  {
    id: "unit7",
    title: "Differential Equations",
    description: "Slope fields and separation of variables",
    examWeight: "6-12%",
    progress: 0,
  },
  {
    id: "unit8",
    title: "Applications of Integration",
    description: "Area, volume, and average value",
    examWeight: "10-15%",
    progress: 0,
  },
];

const biologyUnits: Unit[] = [
  {
    id: "unit1",
    title: "Chemistry of Life",
    description: "Basic chemistry concepts and biological molecules",
    examWeight: "8-11%",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Cell Structure and Function",
    description: "Cell theory, organelles, and cellular processes",
    examWeight: "10-13%",
    progress: 0,
  },
  {
    id: "unit3",
    title: "Cellular Energetics",
    description: "Photosynthesis and cellular respiration",
    examWeight: "12-16%",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Cell Communication and Cell Cycle",
    description: "Cell signaling and the cell cycle",
    examWeight: "10-15%",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Heredity",
    description: "Mendelian genetics and inheritance patterns",
    examWeight: "8-11%",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Gene Expression and Regulation",
    description: "DNA structure, replication, and gene regulation",
    examWeight: "12-16%",
    progress: 0,
  },
  {
    id: "unit7",
    title: "Natural Selection",
    description: "Evolution and natural selection",
    examWeight: "13-20%",
    progress: 0,
  },
  {
    id: "unit8",
    title: "Ecology",
    description: "Population dynamics, communities, and ecosystems",
    examWeight: "10-15%",
    progress: 0,
  },
];

const microeconomicsUnits: Unit[] = [
  {
    id: "unit1",
    title: "Basic Economic Concepts",
    description: "Scarcity, opportunity cost, production possibilities, and comparative advantage",
    examWeight: "12-15%",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Supply and Demand",
    description: "Market equilibrium, consumer and producer surplus, and price controls",
    examWeight: "20-25%",
    progress: 0,
  },
  {
    id: "unit3",
    title: "Production, Cost, and the Perfect Competition Model",
    description: "Production functions, cost curves, and profit maximization",
    examWeight: "22-25%",
    progress: 0,
  },
  {
    id: "unit4",
    title: "Imperfect Competition",
    description: "Monopoly, oligopoly, monopolistic competition, and game theory",
    examWeight: "15-22%",
    progress: 0,
  },
  {
    id: "unit5",
    title: "Factor Markets",
    description: "Labor markets, capital markets, and income distribution",
    examWeight: "10-13%",
    progress: 0,
  },
  {
    id: "unit6",
    title: "Market Failure and the Role of Government",
    description: "Externalities, public goods, and government intervention",
    examWeight: "8-13%",
    progress: 0,
  },
];

const getUnitsForSubject = (subjectId: string): Unit[] => {
  switch (subjectId) {
    case "macroeconomics":
      return macroeconomicsUnits;
    case "microeconomics":
      return microeconomicsUnits;
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
          examWeight: "100%",
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
    ? rawSubject[0] || undefined
    : rawSubject || undefined;

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
    (s) => s.subjectId === subjectId,
  );
  const units = currentSubject
    ? getUnitsForSubject(currentSubject.subjectId)
    : [];

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

  const topicsMastered = 0;
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
              <p className="text-gray-600 mt-1">{currentSubject.description}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {topicsMastered}/{totalTopics}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Topics Mastered
                </div>
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

            {/* Full-Length Practice Test Buttons */}
            <div className="mt-8 flex flex-col gap-3 max-w-md mx-auto">
              <Button
                onClick={() =>
                  router.push(`/practice-test/${subjectId}?type=mcq`)
                }
                className="bg-khan-green hover:bg-khan-green/90 w-full h-12"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                MCQ Full-Length Test
              </Button>
              <Button
                onClick={() =>
                  router.push(`/practice-test/${subjectId}?type=frq`)
                }
                className="bg-khan-blue hover:bg-khan-blue/90 w-full h-12"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                FRQ Full-Length Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Study Units */}
        <div className="space-y-4">
          {units.map((unit, index) => (
            <Card key={unit.id} className="border-l-4 border-l-khan-green">
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
                      <p className="text-sm text-gray-600 mb-2">
                        {unit.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Exam Weight: {unit.examWeight}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 ml-14">
                  <Button
                    onClick={() =>
                      router.push(
                        `/practice-test/${subjectId}?unit=${unit.id}&type=mcq`,
                      )
                    }
                    variant="outline"
                    className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Unit MCQ Practice Test
                  </Button>
                  <Button
                    onClick={() =>
                      router.push(
                        `/practice-test/${subjectId}?unit=${unit.id}&type=frq`,
                      )
                    }
                    variant="outline"
                    className="border-2 border-khan-blue text-khan-blue hover:bg-khan-blue hover:text-white"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Unit FRQ Practice Test
                  </Button>
                </div>
              </CardContent>
            </Card>
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
