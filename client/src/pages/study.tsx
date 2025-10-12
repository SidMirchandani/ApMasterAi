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
  unitProgress?: { [unitId: string]: { status: string; highestScore: number; scores: number[] } };
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

  const { data: subjectsResponse, isLoading: subjectsLoading, refetch } = useQuery<{
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

  const getProgressLevel = (score: number): string => {
    if (score >= 80) return "Mastered";
    if (score >= 60) return "Proficient";
    if (score >= 0) return "Attempted"; // Covers scores below 60 and greater than or equal to 0
    return "Not Started";
  };

  const getProgressBadgeColor = (level: string): string => {
    switch (level) {
      case "Mastered":
        return "bg-green-600 text-white";
      case "Proficient":
        return "bg-green-400 text-white";
      case "Attempted":
        return "bg-orange-400 text-white";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const confirmDelete = prompt(
      `Type "DELETE" to confirm deletion of this course. This action is irreversible.`
    );
    if (confirmDelete === "DELETE") {
      const secondConfirm = confirm(
        "Are you absolutely sure you want to permanently delete this course? This cannot be undone."
      );
      if (secondConfirm) {
        try {
          await apiRequest("DELETE", `/api/user/subjects/${courseId}`);
          refetch(); // Refetch subjects to update the dashboard
          router.push("/dashboard"); // Redirect to dashboard after deletion
        } catch (error) {
          console.error("Failed to delete course:", error);
          alert("An error occurred while deleting the course. Please try again.");
        }
      }
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    try {
      await apiRequest("PATCH", `/api/user/subjects/${courseId}`, { archived: true });
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
    return getProgressLevel(score) === "Mastered";
  }).length;
  const totalTopics = units.length;

  return (
    <div className="min-h-screen bg-khan-background overflow-x-hidden">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentSubject.name}
            </h1>
            <p className="text-gray-600 mt-1">{currentSubject.description}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            size="sm"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>

        {/* Your Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-khan-green" />
              Your Progress
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
            <div className="mt-8 flex flex-col md:flex-row gap-3 max-w-2xl mx-auto items-center">
              <Button
                onClick={() => router.push(`/full-length-history?subject=${subjectId}`)}
                className="bg-khan-green w-full md:flex-1 h-12 min-h-[44px]"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                MCQ Full-Length Test
              </Button>
              <Button
                disabled
                className="bg-khan-blue w-full md:flex-1 h-12 min-h-[44px] opacity-50 cursor-not-allowed"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                FRQ Full-Length Test (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Practice Units */}
        <div className="space-y-4">
          {units.map((unit, index) => (
            <Card key={unit.id} className="border-l-4 border-l-khan-green">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left side: Content */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-khan-green text-white flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {unit.title}
                        </h3>
                        {(() => {
                          const unitData = currentSubject.unitProgress?.[unit.id];
                          const score = unitData?.highestScore || 0;
                          const level = getProgressLevel(score);
                          const badgeColor = getProgressBadgeColor(level);

                          // Add highest score to badge text if available
                          const scoreDisplay = score > 0 ? `: Highest Score: ${Math.round(score)}/100` : '';

                          return (
                            <div className="relative group md:hidden">
                              <Badge
                                className={`text-xs ${badgeColor} border border-black cursor-help`}
                              >
                                {level === "Mastered" && "👑 "}
                                {level} {scoreDisplay}
                              </Badge>

                              {/* Legend on hover */}
                              <div className="absolute top-full left-0 mt-2 hidden group-hover:block bg-white shadow-lg rounded-lg p-3 border border-gray-200 z-10 whitespace-nowrap">
                                <div className="text-xs font-semibold mb-2">Unit Progress Legend</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-600"></div>
                                    <span>Mastered (80%+)</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-400"></div>
                                    <span>Proficient (60%+)</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-orange-400"></div>
                                    <span>Attempted (&lt;60%)</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gray-200"></div>
                                    <span>Not Started</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {unit.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Exam Weight: {unit.examWeight}
                      </Badge>
                    </div>
                  </div>

                  {/* Right side: Buttons stacked vertically on desktop */}
                  <div className="flex flex-col gap-3 md:min-w-[340px] md:items-end">
                    {(() => {
                      const unitData = currentSubject.unitProgress?.[unit.id];
                      const score = unitData?.highestScore || 0;
                      const level = getProgressLevel(score);
                      const badgeColor = getProgressBadgeColor(level);

                      const scoreDisplay = score > 0 ? `: Highest Score: ${Math.round(score)}/100` : '';

                      return (
                        <div className="relative group hidden md:block mb-1">
                          <Badge
                            className={`text-xs ${badgeColor} border border-black cursor-help`}
                          >
                            {level === "Mastered" && "👑 "}
                            {level} {scoreDisplay}
                          </Badge>

                          {/* Legend on hover */}
                          <div className="absolute top-full right-0 mt-2 hidden group-hover:block bg-white shadow-lg rounded-lg p-3 border border-gray-200 z-10 whitespace-nowrap">
                            <div className="text-xs font-semibold mb-2">Unit Progress Legend</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-600"></div>
                                <span>Mastered (80%+)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-400"></div>
                                <span>Proficient (60%+)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-orange-400"></div>
                                <span>Attempted (&lt;60%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-gray-200"></div>
                                <span>Not Started</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <Button
                      onClick={() =>
                        router.push(`/quiz?subject=${subjectId}&unit=${unit.id}`)
                      }
                      variant="outline"
                      className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white min-h-[44px] w-full"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Unit MCQ Practice Test
                    </Button>
                    <Button
                      disabled
                      variant="outline"
                      className="border-2 border-khan-blue text-khan-blue w-full min-h-[44px] opacity-50 cursor-not-allowed"
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