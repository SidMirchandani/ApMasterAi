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
        return "bg-green-400 text-white";
      case "In Progress":
        return "bg-orange-400 text-white";
      default:
        return "bg-gray-200 text-gray-700";
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
          refetch(); // Refetch subjects to update the dashboard
          router.push("/dashboard"); // Redirect to dashboard after deletion
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
      refetch(); // Refetch subjects to update the dashboard
    } catch (error) {
      console.error("Failed to archive course:", error);
      alert("An error occurred while archiving the course. Please try again.");
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

  // Calculate topics mastered based on unit progress
  const topicsMastered = units.filter((unit) => {
    const unitData = currentSubject.unitProgress?.[unit.id];
    const score = unitData?.highestScore || 0;
    const hasAttempted =
      unitData && unitData.scores && unitData.scores.length > 0;
    return getProgressLevel(score, hasAttempted) === "Mastered";
  }).length;
  const totalTopics = units.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 overflow-x-hidden">
      <Navigation />
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              size="sm"
              data-testid="button-back"
              className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {currentSubject.name}
              </h1>
              <p className="text-gray-600 text-sm max-w-3xl">
                {currentSubject.description}
              </p>
            </div>
            <div className="w-36"></div>
          </div>
        </div>

        {/* Your Progress */}
        <Card className="mb-6 shadow-lg border border-gray-200/50 backdrop-blur-sm bg-white/95 rounded-xl transition-all duration-300 hover:shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-khan-green" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50">
                <div className="text-2xl font-bold text-blue-600">
                  {topicsMastered}/{totalTopics}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  Topics Mastered
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200/50">
                <div className="text-2xl font-bold text-orange-600">
                  {formatDate(currentSubject.examDate)}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  Exam Date
                </div>
              </div>
            </div>

            {/* Full-Length Practice Test Buttons */}
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                onClick={() =>
                  router.push(`/full-length-history?subject=${subjectId}`)
                }
                className="bg-khan-green hover:bg-khan-green-light w-full md:flex-1 h-11 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 font-medium"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                MCQ Full-Length Test
              </Button>
              <Button
                disabled
                className="bg-khan-blue w-full md:flex-1 h-11 rounded-lg opacity-50 cursor-not-allowed font-medium shadow-sm"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                FRQ Full-Length Test (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Practice Units */}
        <div className="space-y-4">
          {units.map((unit, index) => (
            <Card
              key={unit.id}
              className="border-l-4 border-l-khan-green shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200/50 rounded-xl bg-white/95 backdrop-blur-sm"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left side: Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm shadow-lg">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-60"></div>
                      <span className="relative z-10">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                        {unit.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        {unit.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-xs font-medium border-gray-300 rounded-md px-2 py-0.5"
                        >
                          Exam Weight: {unit.examWeight}
                        </Badge>
                        {(() => {
                          const unitData =
                            currentSubject.unitProgress?.[unit.id];
                          const score = unitData?.highestScore || 0;
                          const hasAttempted =
                            unitData &&
                            unitData.scores &&
                            unitData.scores.length > 0;
                          const level = getProgressLevel(score, hasAttempted);
                          const badgeColor = getProgressBadgeColor(level);

                          return (
                            <div className="relative group">
                              <Badge
                                className={`text-xs font-medium ${badgeColor} border border-black/20 cursor-help rounded-md px-2 py-0.5 shadow-sm`}
                              >
                                {level === "Mastered" && "👑 "}
                                {level}
                              </Badge>

                              {/* Legend on hover */}
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-white shadow-xl rounded-xl p-3 border border-gray-200/50 z-10 whitespace-nowrap backdrop-blur-sm">
                                <div className="text-xs font-semibold mb-2 text-gray-900">
                                  Unit Progress Legend
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-600 shadow-sm"></div>
                                    <span className="text-gray-700">
                                      Mastered (80%+)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-400 shadow-sm"></div>
                                    <span className="text-gray-700">
                                      Proficient (60%+)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-orange-400 shadow-sm"></div>
                                    <span className="text-gray-700">
                                      In Progress (&lt;60%)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gray-200 shadow-sm"></div>
                                    <span className="text-gray-700">
                                      Not Started
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Buttons stacked vertically on desktop */}
                  <div className="flex flex-col gap-3 md:min-w-[340px] md:items-end">
                    <Button
                      onClick={() =>
                        router.push(
                          `/quiz?subject=${subjectId}&unit=${unit.id}`,
                        )
                      }
                      variant="outline"
                      className="border border-khan-green text-khan-green hover:bg-khan-green hover:text-white h-11 w-full rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 font-medium"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Unit MCQ Practice Test
                    </Button>
                    <Button
                      disabled
                      variant="outline"
                      className="border border-khan-blue text-khan-blue w-full h-11 opacity-50 cursor-not-allowed rounded-lg font-medium shadow-sm"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Unit FRQ Practice Test (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
