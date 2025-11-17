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
  HelpCircle,
  Calendar,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apSubjects } from "@/lib/ap-subjects";
import { formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  unitProgress?: {
    [unitId: string]: {
      status: string;
      highestScore: number;
      scores: number[];
    };
  };
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
    description:
      "Scarcity, opportunity cost, production possibilities, and comparative advantage",
    examWeight: "12-15%",
    progress: 0,
  },
  {
    id: "unit2",
    title: "Supply and Demand",
    description:
      "Market equilibrium, consumer and producer surplus, and price controls",
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
    description:
      "Monopoly, oligopoly, monopolistic competition, and game theory",
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

const computerSciencePrinciplesUnits: Unit[] = [
  {
    id: "bigidea1",
    title: "Creative Development",
    description: "Collaboration, program design, and development processes",
    examWeight: "10-13%",
    progress: 0,
  },
  {
    id: "bigidea2",
    title: "Data",
    description:
      "Data representation, compression, and extraction of information",
    examWeight: "17-22%",
    progress: 0,
  },
  {
    id: "bigidea3",
    title: "Algorithms and Programming",
    description:
      "Variables, control structures, procedures, and program development",
    examWeight: "30-35%",
    progress: 0,
  },
  {
    id: "bigidea4",
    title: "Computer Systems and Networks",
    description: "Internet structure, protocols, and cybersecurity",
    examWeight: "11-15%",
    progress: 0,
  },
  {
    id: "bigidea5",
    title: "Impact of Computing",
    description:
      "Beneficial and harmful effects, digital divide, and computing innovations",
    examWeight: "21-26%",
    progress: 0,
  },
];

const getUnitsForSubject = (subjectId: string): Unit[] => {
  switch (subjectId) {
    case "macroeconomics":
      return macroeconomicsUnits;
    case "microeconomics":
      return microeconomicsUnits;
    case "computer-science-principles":
      return computerSciencePrinciplesUnits;
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
  const isMobile = useIsMobile();

  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject)
    ? rawSubject[0] || undefined
    : rawSubject || undefined;

  const {
    data: subjectsResponse,
    isLoading: subjectsLoading,
    refetch,
  } = useQuery<{
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

  const getProgressLevel = (score: number, hasAttempted: boolean): string => {
    if (!hasAttempted) return "Not Started";
    if (score >= 80) return "Mastered";
    if (score >= 60) return "Proficient";
    return "In Progress";
  };

  const getProgressBadgeColor = (level: string): string => {
    switch (level) {
      case "Mastered":
        return "bg-green-600 text-white";
      case "Proficient":
        return "bg-blue-500 text-white";
      case "In Progress":
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const confirmDelete = prompt(
      `Type "DELETE" to confirm deletion of this course. This action is irreversible.`,
    );
    if (confirmDelete === "DELETE") {
      const secondConfirm = confirm(
        "Are you absolutely sure you want to permanently delete this course? This cannot be undone.",
      );
      if (secondConfirm) {
        try {
          await apiRequest("DELETE", `/api/user/subjects/${courseId}`);
          refetch();
          router.push("/dashboard");
        } catch (error) {
          console.error("Failed to delete course:", error);
          alert(
            "An error occurred while deleting the course. Please try again.",
          );
        }
      }
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    try {
      await apiRequest("PATCH", `/api/user/subjects/${courseId}`, {
        archived: true,
      });
      refetch();
    } catch (error) {
      console.error("Failed to archive course:", error);
      alert("An error occurred while archiving the course. Please try again.");
    }
  };

  if (loading || subjectsLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-white">
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

  const topicsMastered = units.filter((unit) => {
    const unitData = currentSubject.unitProgress?.[unit.id];
    const score = unitData?.highestScore || 0;
    const hasAttempted =
      unitData && unitData.scores && unitData.scores.length > 0;
    return getProgressLevel(score, hasAttempted) === "Mastered";
  }).length;
  const totalTopics = units.length;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {currentSubject.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-6xl">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Topics Mastered</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {topicsMastered}/{totalTopics}
                  </p>
                </div>
                <Trophy className="h-10 w-10 text-khan-green" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Exam Date</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDate(currentSubject.examDate)}
                  </p>
                </div>
                <Calendar className="h-10 w-10 text-khan-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((topicsMastered / totalTopics) * 100)}%
                  </p>
                </div>
                <Target className="h-10 w-10 text-khan-orange" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full-Length Practice Tests */}
        <Card className="mb-8 border-2 border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-khan-green" />
              Full-Length Practice Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() =>
                  router.push(`/full-length-history?subject=${subjectId}`)
                }
                className="bg-khan-green hover:bg-khan-green-light h-12 text-base font-medium"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                MCQ Full-Length Test
              </Button>
              <Button
                disabled
                className="bg-gray-300 h-12 text-base opacity-50 cursor-not-allowed font-medium"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                FRQ Full-Length Test (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Units Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-6 w-6 text-khan-green" />
            Practice by Unit
          </h2>
        </div>

        <div className="space-y-4">
          {units.map((unit, index) => {
            const unitData = currentSubject.unitProgress?.[unit.id];
            const score = unitData?.highestScore || 0;
            const hasAttempted =
              unitData && unitData.scores && unitData.scores.length > 0;
            const level = getProgressLevel(score, hasAttempted);
            const badgeColor = getProgressBadgeColor(level);

            return (
              <Card
                key={unit.id}
                className="border-2 border-gray-200 hover:border-khan-green transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Left: Unit Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-khan-green text-white flex items-center justify-center font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {unit.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {unit.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs border-gray-300 text-gray-700"
                            >
                              Exam Weight: {unit.examWeight}
                            </Badge>
                            <div className="relative group">
                              <Badge className={`text-xs ${badgeColor}`}>
                                {level === "Mastered" && "👑 "}
                                {level}
                              </Badge>

                              {/* Tooltip */}
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-white shadow-xl rounded-lg p-3 border-2 border-gray-200 z-10 whitespace-nowrap">
                                <div className="text-xs font-semibold mb-2 text-gray-900">
                                  Progress Legend
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-600"></div>
                                    <span className="text-gray-700">
                                      Mastered (80%+)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                                    <span className="text-gray-700">
                                      Proficient (60%+)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-orange-500"></div>
                                    <span className="text-gray-700">
                                      In Progress (&lt;60%)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gray-300"></div>
                                    <span className="text-gray-700">
                                      Not Started
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-3 lg:min-w-[280px]">
                      <Button
                        onClick={() =>
                          router.push(
                            `/quiz?subject=${subjectId}&unit=${unit.id}`,
                          )
                        }
                        className="bg-khan-green hover:bg-khan-green-light h-11 font-medium"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Unit MCQ Practice
                      </Button>
                      <Button
                        disabled
                        variant="outline"
                        className="border-2 border-gray-300 h-11 opacity-50 cursor-not-allowed font-medium"
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Unit FRQ Practice (Soon)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}