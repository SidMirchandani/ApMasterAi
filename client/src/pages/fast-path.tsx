import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
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
import { getApiCodeForSubject } from "@/subjects";
import { withQuizFromParam } from "@/lib/quiz-return";
import { buildMicroLessonPath } from "@/lib/micro-lesson-flow";
import { getMicroDrillGoalScore } from "@/lib/micro-drill-checkpoint";
import { getSubjectDisplayName } from "../../../lib/subject-display-names";
import { getAPScoreColor } from "@/lib/ap-score-utils";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";
import {
  computeFastPathPlan,
  PHASE1_SIZE,
  type UnitWithYield,
} from "@/lib/fast-path-plan";
import {
  FAST_PATH_COPY,
  getFastPathPageTitle,
  getPrimarySectionTitle,
  getPrimarySectionBody,
  getSecondarySectionTitle,
  getSecondarySectionBody,
  getFastPathScoreTier,
} from "@/lib/fast-path-copy";

export default function FastPathPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const subjectId = router.query.subject as string | undefined;
  const [studyNotesPrimerEnabled, setStudyNotesPrimerEnabled] = useState(true);

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

  const plan = useMemo(() => {
    if (!subjectId) return null;
    return computeFastPathPlan({
      subjectId,
      subjectCode,
      unitProgressMap,
      testHistory,
      unitDifficultiesMap,
    });
  }, [subjectId, subjectCode, unitProgressMap, testHistory, unitDifficultiesMap]);

  const {
    unitsWithYield,
    currentPercentage,
    predicted,
    target4,
    target5,
    hasDiagnostic,
    phase1,
    phase2,
    phase3,
    masteredUnits,
  } = plan ?? {
    unitsWithYield: [] as UnitWithYield[],
    currentPercentage: 0,
    predicted: null,
    target4: 0,
    target5: 0,
    hasDiagnostic: false,
    phase1: [] as UnitWithYield[],
    phase2: [] as UnitWithYield[],
    phase3: [] as UnitWithYield[],
    masteredUnits: [] as UnitWithYield[],
  };

  const subjectDisplayName = subjectId
    ? getSubjectDisplayName(subjectCode ?? subjectId ?? "")
    : undefined;

  const pageTitle = subjectDisplayName
    ? getFastPathPageTitle(subjectDisplayName, predicted)
    : "Fast Path";
  const scoreTier = getFastPathScoreTier(predicted);
  const drillGoalScore = getMicroDrillGoalScore(predicted?.score ?? null);
  const boundedCurrentPercentage = Math.min(100, Math.max(0, currentPercentage));
  const weightedScoreLabelPosition = Math.min(88, Math.max(12, boundedCurrentPercentage));
  const target4Position = Math.min(100, Math.max(0, target4));
  const target5Position = Math.min(100, Math.max(0, target5));
  const targetLabelGroupPosition = Math.min(82, Math.max(58, (target4Position + target5Position) / 2));
  const scoreBadgeColor = predicted?.color ?? "#6b7280";
  const scoreFillColor = scoreTier === "at5" ? "#16a34a" : predicted?.color ?? "#2563eb";
  const target4Color = getAPScoreColor(4);
  const target5Color = getAPScoreColor(5);
  const primarySectionTitle =
    scoreTier === "at5" ? FAST_PATH_COPY.priorityPractice : getPrimarySectionTitle(predicted);
  const primarySectionBody =
    scoreTier === "at5"
      ? "Your highest-yield unit that still has room to improve. Quick drills keep your 5 sharp."
      : getPrimarySectionBody(predicted, phase1.length);
  const secondarySectionTitle =
    scoreTier === "toward4" ? getSecondarySectionTitle(predicted) : FAST_PATH_COPY.morePractice;
  const secondarySectionBody =
    scoreTier === "at5"
      ? "Optional polish on remaining units-you've already closed the gap to a 5."
      : getSecondarySectionBody(predicted);

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
            {subjectId ? pageTitle : "Fast Path"}
          </h1>
          {subjectId && (
            <label className="mt-2 flex w-fit cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <input
                type="checkbox"
                checked={studyNotesPrimerEnabled}
                onChange={(e) => setStudyNotesPrimerEnabled(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-khan-green focus:ring-khan-green dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Optional quick review before first 5 questions (on by default; lesson is the teach step)
              </span>
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
                Select a subject to see your Fast Path plan.
              </p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <Button
                    key={s.subjectId}
                    variant="outline"
                    onClick={() => router.push(`/fast-path?subject=${s.subjectId}`)}
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
        ) : !hasDiagnostic ? (
          <div className="text-center py-14 px-4">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
              <Target className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {FAST_PATH_COPY.checkMyScore}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto text-sm leading-relaxed">
              {FAST_PATH_COPY.diagnosticSubline(35)}
            </p>
            <p className="text-gray-400 dark:text-gray-500 mb-6 max-w-md mx-auto text-xs">
              {FAST_PATH_COPY.diagnosticPauseLine(35)}
            </p>
            <Button
              onClick={() => router.push(`/diagnostic?subject=${subjectId}`)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 h-11 rounded-xl shadow-md"
            >
              {FAST_PATH_COPY.checkMyScore}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Progress Tracker */}
            <Card className="border-green-200 bg-white shadow-sm dark:border-green-900/60 dark:bg-gray-900">
              <CardContent className="grid gap-4 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(0,3fr)] sm:items-start">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-center text-base font-bold uppercase tracking-wide text-green-700 dark:text-green-300">
                    <span className="inline-block">Predicted</span>{" "}
                    <span className="inline-block">AP Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <APScoreCircle
                      score={predicted?.score ?? null}
                      color={predicted?.color ?? "#9ca3af"}
                      size="lg"
                      responsive
                    />
                    <APScoreExplainDialog inline triggerClassName="ml-0.5" />
                  </div>
                </div>

                <div className="min-w-0 pt-5 sm:pt-8">
                  <div className="w-full pb-6 pt-7">
                  <div className="relative h-0 text-xs">
                    <span
                      className="absolute bottom-3 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:px-3 sm:text-sm"
                      style={{
                        left: `${weightedScoreLabelPosition}%`,
                        backgroundColor: scoreBadgeColor,
                      }}
                    >
                      <span>YOU: {predicted?.score ?? "—"}: ~{currentPercentage}%</span>
                    </span>
                  </div>
                  <div className="relative h-5 rounded-full bg-gray-200 shadow-inner dark:bg-gray-700">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{
                          width: `${boundedCurrentPercentage}%`,
                          backgroundColor: scoreFillColor,
                        }}
                      />
                      <div
                        className="absolute -top-1 -bottom-1 z-20 w-1 -translate-x-1/2 rounded-full shadow-sm"
                        style={{
                          left: `${boundedCurrentPercentage}%`,
                          backgroundColor: scoreBadgeColor,
                        }}
                        title={`Weighted score: ~${currentPercentage}%`}
                      />
                      <div
                        className="absolute -top-1 -bottom-1 z-10 w-0.5 -translate-x-1/2 rounded-full"
                        style={{
                          left: `${target4Position}%`,
                          backgroundColor: target4Color,
                        }}
                        title={`Score needed for 4: ~${Math.round(target4)}%`}
                      />
                      <div
                        className="absolute -top-1 -bottom-1 z-10 w-0.5 -translate-x-1/2 rounded-full"
                        style={{
                          left: `${target5Position}%`,
                          backgroundColor: target5Color,
                        }}
                        title={`Score needed for 5: ~${Math.round(target5)}%`}
                      />
                    </div>
                  <div className="relative mt-2 h-14 text-[9px] font-bold sm:h-7 sm:text-xs">
                    <span className="absolute left-0 top-0 rounded-full bg-gray-100 px-1.5 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:px-2.5">
                      0%
                    </span>
                    <div
                      className="absolute top-7 flex -translate-x-1/2 items-center gap-1 sm:top-0"
                      style={{ left: `${targetLabelGroupPosition}%` }}
                    >
                      <span
                        className="whitespace-nowrap rounded-full px-1.5 py-1 text-white shadow-sm sm:px-2.5"
                        style={{ backgroundColor: target4Color }}
                      >
                        4: ~{Math.round(target4)}%
                      </span>
                      <span
                        className="whitespace-nowrap rounded-full px-1.5 py-1 text-white shadow-sm sm:px-2.5"
                        style={{ backgroundColor: target5Color }}
                      >
                        5: ~{Math.round(target5)}%
                      </span>
                    </div>
                    <span className="absolute right-0 top-0 rounded-full bg-gray-100 px-1.5 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:px-2.5">
                      100%
                    </span>
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {phase1.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 border-2 border-green-200 dark:border-green-800/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                    {getPrimarySectionTitle(predicted)}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getPrimarySectionBody(predicted, phase1.length)}
                    {scoreTier === "toward4" && phase1.length > 0 && phase1.length < PHASE1_SIZE && (
                      <span className="block mt-1">
                        Mastering {phase1.length === 1 ? "this unit" : "these units"} can close your gap to a 4.
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {phase1.map((unit) => (
                      <UnitPhaseCard
                        key={unit.unitId}
                        unit={unit}
                        subjectId={subjectId!}
                        variant="primary"
                        studyNotesPrimerEnabled={studyNotesPrimerEnabled}
                        goalScore={drillGoalScore}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {phase2.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 opacity-95">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">
                    {getSecondarySectionTitle(predicted)}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getSecondarySectionBody(predicted)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {phase2.map((unit) => (
                      <UnitPhaseCard
                        key={unit.unitId}
                        unit={unit}
                        subjectId={subjectId!}
                        variant="secondary"
                        studyNotesPrimerEnabled={studyNotesPrimerEnabled}
                        goalScore={drillGoalScore}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {phase3.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700 opacity-90 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">
                    {FAST_PATH_COPY.finalPolish}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {FAST_PATH_COPY.finalPolishBody}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {phase3.map((unit) => (
                      <UnitPhaseCard
                        key={unit.unitId}
                        unit={unit}
                        subjectId={subjectId!}
                        variant="tertiary"
                        studyNotesPrimerEnabled={studyNotesPrimerEnabled}
                        goalScore={drillGoalScore}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {masteredUnits.length > 0 && (
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
                    <Crown className="w-5 h-5 text-amber-500" />
                    {FAST_PATH_COPY.securedUnits} ({masteredUnits.length})
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {FAST_PATH_COPY.securedBody}
                  </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
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
                            onClick={() =>
                              router.push(
                                withQuizFromParam(
                                  `/quiz?subject=${subjectId}&unit=${unit.unitId}`,
                                  "fast-path",
                                ),
                              )
                            }
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Refresher
                          </Button>
                        </div>
                      ))}
                    </div>
                </CardContent>
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
  goalScore,
}: {
  unit: UnitWithYield;
  subjectId: string;
  variant: "primary" | "secondary" | "tertiary";
  studyNotesPrimerEnabled?: boolean;
  goalScore: 4 | 5;
}) {
  const router = useRouter();
  const pointsLabel = unit.pointsAvailable > 0
    ? `+${unit.pointsAvailable.toFixed(1)}%`
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
      className={`flex h-full flex-col gap-3 rounded-xl border p-4 ${cardClass}`}
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
        className="mt-auto w-full rounded-xl font-semibold"
        variant={variant === "primary" ? "default" : "outline"}
        onClick={() =>
          router.push(
            buildMicroLessonPath({
              subjectId,
              sectionCode: unit.sectionCode,
              unitId: unit.unitId,
              from: "fast-path",
              goal: goalScore,
              primer: studyNotesPrimerEnabled,
            }),
          )
        }
      >
        <Play className="w-4 h-4 mr-2" />
        Read &amp; drill
      </Button>
    </div>
  );
}
