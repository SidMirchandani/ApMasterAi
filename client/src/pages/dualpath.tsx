import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Sparkles,
  Crown,
  Play,
} from "lucide-react";
import { APScoreCircle } from "@/components/ui/APScoreCircle";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  getUnitsForSubject,
  getApiCodeForSubject,
  getSectionCodeForUnit,
  getSectionByCode,
  getUnitWeightsBySectionCode,
} from "@/subjects";
import {
  getPredictedAPScoreFromTests,
  getTargetPercentagesForSubject,
  getAPScoreColor,
} from "@/lib/ap-score-utils";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";

interface UnitWithYield {
  unitId: string;
  sectionCode: string;
  name: string;
  unitNumber: number;
  weight: number;
  bestPct: number;
  pointsAvailable: number;
  masteryScore: number;
  mastered: boolean;
  yieldScore: number;
  unitDifficulty: number;
}

const PHASE1_SIZE = 3;
const PHASE2_SIZE = 5;

export default function DualPathPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = router.query.subject as string | undefined;
  const [securedOpen, setSecuredOpen] = useState(false);
  const [studyNotesPrimerEnabled, setStudyNotesPrimerEnabled] = useState(false);

  const { data: adminCheck } = useQuery<{ success: boolean; data: { isAdmin: boolean } }>({
    queryKey: ["adminCheck"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/admin-check");
      if (!res.ok) return { success: false, data: { isAdmin: false } };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = adminCheck?.data?.isAdmin ?? false;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: subjectsResponse } = useQuery<{ success: boolean; data: { subjectId: string; name: string }[] }>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
    enabled: isAuthenticated && !!user && !subjectId,
  });
  const subjects = subjectsResponse?.data || [];

  const { data: testHistoryResponse } = useQuery<{
    success: boolean;
    data: { percentage: number; sectionBreakdown?: Record<string, { correct: number; total: number }> }[];
  }>({
    queryKey: ["testHistory", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/test-history?subjectId=${subjectId}`
        : "/api/user/test-history";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch test history");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });
  const testHistory = testHistoryResponse?.data || [];

  const { data: unitProgressResponse } = useQuery<{ success: boolean; data: Record<string, { highestScore?: number; mcqScore?: number }> }>({
    queryKey: ["unitProgress", subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/subjects/${subjectId}/unit-progress`);
      if (!res.ok) throw new Error("Failed to fetch unit progress");
      return res.json();
    },
    enabled: isAuthenticated && !!user && !!subjectId,
  });
  const unitProgressMap = unitProgressResponse?.data || {};
  const subjectCode = subjectId ? getApiCodeForSubject(subjectId) : undefined;

  const { data: unitDifficultiesResponse } = useQuery<{ success: boolean; data: Record<string, number> }>({
    queryKey: ["unitDifficulties", subjectCode],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/subject-config/${subjectCode}/unit-difficulties`);
      if (!res.ok) throw new Error("Failed to fetch unit difficulties");
      return res.json();
    },
    enabled: !!subjectCode,
  });
  const unitDifficultiesMap = unitDifficultiesResponse?.data ?? {};

  const { target4, target5 } = getTargetPercentagesForSubject(subjectCode);

  const unitBestMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(unitProgressMap).forEach(([code, prog]) => {
      map[code] = Math.max(map[code] ?? 0, prog.highestScore ?? prog.mcqScore ?? 0);
    });
    testHistory.forEach((test) => {
      if (test.sectionBreakdown) {
        Object.entries(test.sectionBreakdown).forEach(([code, section]) => {
          const pct = section.total > 0 ? Math.round((section.correct / section.total) * 100) : 0;
          map[code] = Math.max(map[code] ?? 0, pct);
        });
      }
    });
    return map;
  }, [unitProgressMap, testHistory]);

  const unitWeights = subjectId ? getUnitWeightsBySectionCode(subjectId) : {};
  const units = subjectId ? getUnitsForSubject(subjectId) : [];

  const unitsWithYield: UnitWithYield[] = useMemo(() => {
    return units
      .map((unit) => {
        const sectionCode = getSectionCodeForUnit(subjectId!, unit.id) ?? "";
        const weight = unitWeights[sectionCode] ?? 0;
        const bestPct = unitBestMap[sectionCode] ?? 0;
        const masteryScore = bestPct / 100;
        const pointsAvailable = weight * (1 - masteryScore);
        const unitDifficulty = unitDifficultiesMap[sectionCode] ?? 1;
        const yieldScore = (weight * (1 - masteryScore)) / (unitDifficulty || 1);
        const sectionInfo = getSectionByCode(subjectId!, sectionCode);
        const name = sectionInfo?.name ?? unit.title;
        const unitNumber = sectionInfo?.unitNumber ?? 0;
        const mastered = masteryScore > 0.85;
        return {
          unitId: unit.id,
          sectionCode,
          name,
          unitNumber,
          weight,
          bestPct,
          pointsAvailable,
          masteryScore,
          mastered,
          yieldScore,
          unitDifficulty,
        };
      })
      .filter((u) => u.sectionCode);
  }, [subjectId, units, unitWeights, unitBestMap, unitDifficultiesMap]);

  const currentPercentage = useMemo(() => {
    if (Object.keys(unitWeights).length === 0) {
      if (testHistory.length > 0) return Math.round(testHistory[testHistory.length - 1].percentage);
      return 0;
    }
    const weighted = unitsWithYield.reduce(
      (sum, u) => sum + (u.bestPct / 100) * u.weight,
      0
    );
    return Math.round(weighted);
  }, [unitWeights, unitsWithYield, testHistory]);

  const hasEnoughForPrediction = testHistory.length > 0 || unitsWithYield.some((u) => u.bestPct > 0);
  const predicted = getPredictedAPScoreFromTests(currentPercentage, subjectCode);
  const gapTo4 = Math.max(0, Math.round((target4 - currentPercentage) * 10) / 10);
  const gapTo5 = Math.max(0, Math.round((target5 - currentPercentage) * 10) / 10);

  const masteredUnits = useMemo(() => unitsWithYield.filter((u) => u.mastered), [unitsWithYield]);
  const unmasteredByYield = useMemo(
    () =>
      [...unitsWithYield.filter((u) => !u.mastered)].sort(
        (a, b) => b.yieldScore - a.yieldScore
      ),
    [unitsWithYield]
  );
  const phase1 = useMemo(() => {
    if (predicted != null && predicted.score >= 4) {
      // When already at 4: Phase 1 = single top-yield unit to lock in / build toward 5
      return unmasteredByYield.slice(0, 1);
    }
    let sum = 0;
    const result: UnitWithYield[] = [];
    for (const u of unmasteredByYield) {
      if (result.length >= PHASE1_SIZE) break;
      result.push(u);
      sum += u.pointsAvailable;
      if (sum >= gapTo4) break;
    }
    return result;
  }, [unmasteredByYield, gapTo4, predicted]);
  const phase2 = useMemo(() => {
    if (predicted != null && predicted.score >= 4) {
      // When at 4: Phase 2 = all remaining units (DualPath)
      return unmasteredByYield.slice(phase1.length);
    }
    return unmasteredByYield.slice(phase1.length, phase1.length + PHASE2_SIZE);
  }, [unmasteredByYield, phase1.length, predicted]);
  const phase3 = useMemo(() => {
    if (predicted != null && predicted.score >= 4) return [];
    return unmasteredByYield.slice(phase1.length + PHASE2_SIZE);
  }, [unmasteredByYield, phase1.length, predicted]);

  const subjectDisplayName = subjectId
    ? getSubjectDisplayName(subjectCode ?? subjectId ?? "")
    : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-11 w-11">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500 dark:border-t-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Target className="w-6 h-6 text-khan-green" />
            {subjectDisplayName ? `${subjectDisplayName}: DualPath` : "DualPath"}
          </h1>
          {isAdmin && subjectId && (
            <label className="mt-2 flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={studyNotesPrimerEnabled}
                onChange={(e) => setStudyNotesPrimerEnabled(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-khan-green focus:ring-khan-green"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Study Notes Primer (Micro-Drills)</span>
            </label>
          )}
        </div>

        {!subjectId ? (
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-gray-100">Choose a Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select a subject to see your DualPath plan.
              </p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <Button
                    key={s.subjectId}
                    variant="outline"
                    onClick={() => router.push(`/dualpath?subject=${s.subjectId}`)}
                    className="rounded-xl"
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => router.push("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : !hasEnoughForPrediction && testHistory.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-800/50">
              <Target className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Unlock Your DualPath
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Take our adaptive diagnostic to see your projected score and which units will get you to a 4 or 5.
            </p>
            <Button
              onClick={() => router.push(`/diagnostic?subject=${subjectId}`)}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 h-11 rounded-xl shadow-md"
            >
              Take Quick Diagnostic Test
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Progress Tracker */}
            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                  <span>Predicted AP Score: {predicted?.score ?? "—"}</span>
                  <APScoreExplainDialog inline triggerClassName="ml-0.5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                  <APScoreCircle
                    score={predicted?.score ?? null}
                    color={predicted?.color ?? "#9ca3af"}
                    variant="dashboard"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      You are +{gapTo4}% away from a 4, and +{gapTo5}% away from a 5.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Weighted score: ~{currentPercentage}%
                    </p>
                  </div>
                </div>
                <div className="w-full">
                  <div className="relative h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, currentPercentage)}%`,
                          backgroundColor: predicted?.color ?? "#6b7280",
                        }}
                      />
                      {currentPercentage < target4 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-gray-100 z-10"
                          style={{ left: `${target4}%` }}
                          title={`Score needed for 4: ~${target4}%`}
                        />
                      )}
                      {currentPercentage < target5 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                          style={{ left: `${target5}%` }}
                          title={`Score needed for 5: ~${target5}%`}
                        />
                      )}
                    </div>
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    <span>0%</span>
                    <span>4: ~{Math.round(target4)}%</span>
                    <span>5: ~{Math.round(target5)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase 1: Path to a 4 / Lock in your 4 */}
            {phase1.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 border-2 border-green-200 dark:border-green-800/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                    {predicted && predicted.score >= 4
                      ? "Phase 1: Lock In Your 4"
                      : "Phase 1: Your Path to a 4"}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {predicted && predicted.score >= 4
                      ? phase1.length === 1
                        ? "Your single highest-yield unit. Master this to solidify your 4 and build toward a 5."
                        : "Highest-yield units. Master these to solidify your 4 and build toward a 5."
                      : "Highest-yield units. Master these first to maximize your chance at a 4."}
                    {predicted && predicted.score < 4 && phase1.length > 0 && phase1.length < PHASE1_SIZE && (
                      <span className="block mt-1">
                        Mastering {phase1.length === 1 ? "this unit" : "these units"} can close your gap to a 4.
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {phase1.map((unit) => (
                      <UnitPhaseCard
                        key={unit.unitId}
                        unit={unit}
                        subjectId={subjectId!}
                        variant="primary"
                        studyNotesPrimerEnabled={studyNotesPrimerEnabled}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 2: Path to a 5 */}
            {phase2.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 opacity-95">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">
                    Phase 2: Your Path to a 5
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {predicted && predicted.score >= 4
                      ? "These units will take you the rest of the way to a 5."
                      : "Clear Phase 1 to unlock your highest probability of a 4. These units will take you the rest of the way to a 5."}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {phase2.map((unit) => (
                      <UnitPhaseCard
                        key={unit.unitId}
                        unit={unit}
                        subjectId={subjectId!}
                        variant="secondary"
                        studyNotesPrimerEnabled={studyNotesPrimerEnabled}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 3: Final Polish */}
            {phase3.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 opacity-90 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">
                    Phase 3: The Final Polish
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    These units are highly complex and carry less exam weight. Tackle these last once you&apos;ve secured the easier points above.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {phase3.map((unit) => (
                      <UnitPhaseCard
                        key={unit.unitId}
                        unit={unit}
                        subjectId={subjectId!}
                        variant="tertiary"
                        studyNotesPrimerEnabled={studyNotesPrimerEnabled}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secured Points (mastered) */}
            {masteredUnits.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <button
                    type="button"
                    onClick={() => setSecuredOpen(!securedOpen)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Secured Points ({masteredUnits.length})
                    </CardTitle>
                    {securedOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You&apos;ve mastered these. We&apos;ll give you a quick refresher before exam day.
                  </p>
                </CardHeader>
                {securedOpen && (
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {masteredUnits.map((unit) => (
                        <div
                          key={unit.unitId}
                          className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {unit.unitNumber ? `Unit ${unit.unitNumber}: ` : ""}{unit.name}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-xs"
                            onClick={() => router.push(`/quiz?subject=${subjectId}&unit=${unit.unitId}`)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Refresher
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
      <SimpleFooter />
    </div>
  );
}

function UnitPhaseCard({
  unit,
  subjectId,
  variant,
  studyNotesPrimerEnabled,
}: {
  unit: UnitWithYield;
  subjectId: string;
  variant: "primary" | "secondary" | "tertiary";
  studyNotesPrimerEnabled?: boolean;
}) {
  const router = useRouter();
  const pointsLabel = unit.pointsAvailable > 0
    ? `+${unit.pointsAvailable.toFixed(1)}% to AP Score`
    : "—";
  const masteryLabel = unit.bestPct > 0
    ? `Your best: ${unit.bestPct}%`
    : "Not yet practiced";

  const cardClass =
    variant === "primary"
      ? "bg-white dark:bg-gray-900 border-green-200 dark:border-green-800/50 shadow-sm"
      : variant === "secondary"
      ? "bg-gray-50/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
      : "bg-gray-50/60 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700";

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          {unit.unitNumber ? `Unit ${unit.unitNumber}: ` : ""}{unit.name}
        </h3>
        <Badge className="bg-green-600 hover:bg-green-600 text-white border-0 flex-shrink-0">
          {pointsLabel}
        </Badge>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
        {masteryLabel}
      </p>
      <Button
        className="w-full rounded-xl font-semibold"
        variant={variant === "primary" ? "default" : "outline"}
        onClick={() => router.push(`/quiz?subject=${subjectId}&unit=${unit.unitId}&limit=10${studyNotesPrimerEnabled ? "&primer=1" : ""}`)}
      >
        <Play className="w-4 h-4 mr-2" />
        Start Micro-Drill
      </Button>
    </div>
  );
}
