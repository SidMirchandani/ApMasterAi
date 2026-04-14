"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import { Users, MessageCircle, Loader2, Calendar, BookOpen, MapPin, ClipboardList, ListChecks } from "lucide-react";
import {
  SUBJECT_DISPLAY_NAMES,
  getSubjectDisplayName,
  getSubjectShortName,
} from "../../../../lib/subject-display-names";
import { getUsStateDisplayName } from "../../../../lib/us-state-display-name";

type DateRangeKey = "7d" | "30d" | "90d" | "all";

interface SignUpPoint {
  date: string;
  count: number;
  cumulative: number;
}

interface CourseEnrollment {
  subjectId: string;
  count: number;
  displayName?: string;
}

interface ApScoreLiftBySubjectRow {
  subjectId: string;
  averageLift: number;
  count: number;
}

interface StateCount {
  stateCode: string;
  count: number;
}

interface InsightsData {
  totalStudents: number;
  activeUsersDAU: number;
  activeUsersMAU: number;
  totalSubjectsEnrolled: number;
  /** Question bank size (content library), not student attempts */
  totalQuestionsAnswered: number;
  questionBankTotal?: number;
  averageApScoreLift?: number | null;
  platformAccuracyRate: number;
  averageApScoreLiftBySubject?: ApScoreLiftBySubjectRow[];
  usersByState?: StateCount[];
  /** Count of users with no inferred US state (International bucket). */
  internationalRegionCount?: number;
  /** Distinct US state codes (excluding International) with at least one user. */
  statesWithUsersCount?: number;
  totalQuizzesTaken?: number;
  /** Sum of attemptCount in user_question_state (tracked answers). */
  totalStudentQuestionAttempts?: number;
  signUpsOverTime: SignUpPoint[];
  enrollmentsOverTime: SignUpPoint[];
  courseEnrollments: CourseEnrollment[];
}

const chartConfig = {
  cumulative: { label: "Total Signups", color: "hsl(142, 76%, 36%)" },
  signups: { label: "Sign-Ups", color: "hsl(var(--chart-1))" },
  count: { label: "New", color: "hsl(var(--chart-2))" },
  enrollments: { label: "Enrollments", color: "hsl(var(--chart-3))" },
  enrollmentsCumulative: { label: "Total Enrollments", color: "hsl(200, 70%, 40%)" },
};

/** When true, shows the Average AP Score Lift per Subject table. Lift data is always returned by the insights API. */
const SHOW_AVERAGE_AP_SCORE_LIFT_UI = false;

/** Alternating shades of blue (theme) for enrollment bar chart so each subject bar is easy to distinguish. */
const ENROLLMENT_BAR_SHADES = ["hsl(217, 91%, 58%)", "hsl(217, 91%, 48%)"];
function getEnrollmentBarShade(index: number): string {
  return ENROLLMENT_BAR_SHADES[index % ENROLLMENT_BAR_SHADES.length];
}

/** Distinct fills for geographic region slices (pie / legend). */
const REGION_SLICE_PALETTE = [
  "hsl(217, 91%, 55%)",
  "hsl(280, 58%, 52%)",
  "hsl(25, 90%, 48%)",
  "hsl(152, 55%, 40%)",
  "hsl(340, 72%, 52%)",
  "hsl(199, 85%, 48%)",
  "hsl(48, 92%, 45%)",
  "hsl(262, 52%, 52%)",
];
function regionSliceFill(index: number): string {
  return REGION_SLICE_PALETTE[index % REGION_SLICE_PALETTE.length];
}

const RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

function formatChartDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "2-digit" : undefined,
  });
}

/** Shorter x-axis labels to avoid overlap on dense series / narrow widths. */
function formatAxisDate(dateStr: string, compact: boolean) {
  const d = new Date(dateStr);
  if (compact) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return formatChartDate(dateStr);
}

/**
 * Picks dates that actually exist in the series so Recharts category/time axes align.
 * When there are many points, limits tick count for readability.
 */
function getXAxisTicks(dates: string[], maxTicks: number): string[] | undefined {
  if (dates.length === 0) return undefined;
  if (dates.length <= maxTicks) return undefined;
  const last = dates.length - 1;
  const picked = new Set<string>();
  for (let i = 0; i < maxTicks; i++) {
    const idx = Math.round((i / Math.max(1, maxTicks - 1)) * last);
    picked.add(dates[idx]);
  }
  return [...picked].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

function useNarrowInsights(width = 640) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${width - 1}px)`);
    const upd = () => setNarrow(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, [width]);
  return narrow;
}

/** Chart/tooltip label: use shared student-friendly display name. */
function chartLabelForSubject(displayName?: string | null, subjectId?: string): string {
  if (subjectId && SUBJECT_DISPLAY_NAMES[subjectId]) return SUBJECT_DISPLAY_NAMES[subjectId];
  if (displayName && displayName.trim()) return displayName.trim();
  return getSubjectDisplayName(subjectId ?? "");
}

/** Full display name for tooltip (same student-friendly name as chart). */
function fullSubjectName(displayName?: string | null, subjectId?: string): string {
  return chartLabelForSubject(displayName, subjectId);
}

/** Same ordering for lift table and enrollments chart — alphabetical by student-facing short name (e.g. AP Macro). */
function compareSubjectsByShortName(aId: string, bId: string): number {
  return getSubjectShortName(aId).localeCompare(getSubjectShortName(bId), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

const DONUT_LABEL_RAD = Math.PI / 180;

/**
 * Recharts Pie label: leader line from slice outer edge + region + count (outside the donut).
 * `percent` is 0–1 in Recharts 2.x; skip labels for extremely thin slices to reduce clutter.
 */
function RegionDonutOutsideLabel(props: {
  cx?: number | string;
  cy?: number | string;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  value?: number;
  percent?: number;
  payload?: { name?: string; value?: number; fill?: string };
}) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle) || 0;
  const outerR = Number(props.outerRadius);
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(outerR) || outerR <= 0) return null;
  if (typeof props.percent === "number" && props.percent > 0 && props.percent < 0.022) return null;

  const labelName = String(props.name ?? props.payload?.name ?? "");
  const labelValue = Number(props.value ?? props.payload?.value ?? 0);
  const sin = Math.sin(-DONUT_LABEL_RAD * midAngle);
  const cos = Math.cos(-DONUT_LABEL_RAD * midAngle);
  const rim = outerR + 3;
  const sx = cx + rim * cos;
  const sy = cy + rim * sin;
  const elbowR = outerR + 18;
  const mx = cx + elbowR * cos;
  const my = cy + elbowR * sin;
  const isRight = cos >= 0;
  const horiz = 16;
  const ex = mx + (isRight ? 1 : -1) * horiz;
  const ey = my;
  const dotFill =
    typeof props.payload?.fill === "string" && props.payload.fill ? props.payload.fill : "hsl(217, 91%, 50%)";
  const text = `${labelName} (${labelValue.toLocaleString()})`;

  return (
    <g className="recharts-region-donut-label">
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke="hsl(215, 16%, 47%)"
        fill="none"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark:stroke-slate-500"
      />
      <circle cx={sx} cy={sy} r={2} fill={dotFill} />
      <text
        x={ex + (isRight ? 4 : -4)}
        y={ey}
        className="fill-slate-700 dark:fill-slate-200"
        textAnchor={isRight ? "start" : "end"}
        dominantBaseline="middle"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {text}
      </text>
    </g>
  );
}

export function AdminInsightsTab({ token }: { token: string }) {
  const narrow = useNarrowInsights(640);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");

  // Hooks must run unconditionally before any early return
  const totalStudents = data?.totalStudents ?? 0;
  const totalQuestions = data?.questionBankTotal ?? data?.totalQuestionsAnswered ?? 0;
  const totalSubjects = data?.totalSubjectsEnrolled ?? 0;
  const statesWithUsers = data?.statesWithUsersCount ?? 0;
  const totalQuizzes = data?.totalQuizzesTaken ?? 0;
  const totalStudentAnswers = data?.totalStudentQuestionAttempts ?? 0;
  const countUpStudents = useCountUp(totalStudents);
  const countUpQuestions = useCountUp(totalQuestions);
  const countUpSubjects = useCountUp(totalSubjects);
  const countUpStates = useCountUp(statesWithUsers);
  const countUpQuizzes = useCountUp(totalQuizzes);
  const countUpStudentAnswers = useCountUp(totalStudentAnswers);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const url = `/api/admin/insights${dateRange ? `?range=${dateRange}` : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to Load Insights");
        return res.json();
      })
      .then((json) => {
        setData(json.data || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardContent className="py-5 text-center text-slate-500 dark:text-slate-400">
          {error || "No insights data available."}
        </CardContent>
      </Card>
    );
  }

  const hasSignupData =
    data.signUpsOverTime.length > 0 &&
    data.signUpsOverTime.some((p) => p.cumulative > 0);

  const enrollmentsOverTime = data.enrollmentsOverTime ?? [];
  const hasEnrollmentData =
    enrollmentsOverTime.length > 0 &&
    enrollmentsOverTime.some((p) => p.cumulative > 0);
  const signupDates = data.signUpsOverTime.map((p) => p.date);
  const enrollmentDates = enrollmentsOverTime.map((p) => p.date);
  const axisTickBudget = narrow ? 6 : 11;
  const signupXTicks = getXAxisTicks(signupDates, axisTickBudget);
  const enrollmentXTicks = getXAxisTicks(enrollmentDates, axisTickBudget);

  const liftBarRows = SHOW_AVERAGE_AP_SCORE_LIFT_UI
    ? [...(data.averageApScoreLiftBySubject ?? [])].sort((a, b) =>
        compareSubjectsByShortName(a.subjectId, b.subjectId)
      )
    : [];
  const hasLiftBySubject =
    SHOW_AVERAGE_AP_SCORE_LIFT_UI && (data.averageApScoreLiftBySubject?.length ?? 0) > 0;

  const HIDDEN_SUBJECTS = new Set(["APES", "APHUG"]);
  const courseEnrollmentsOrdered = [...data.courseEnrollments]
    .map((e) => {
      const id = e.subjectId?.toUpperCase?.() ?? e.subjectId;
      const normalizedId = id === "APWH" ? "APWORLD" : id;
      return { ...e, subjectId: normalizedId };
    })
    .filter((e) => !HIDDEN_SUBJECTS.has(e.subjectId))
    .sort((a, b) => compareSubjectsByShortName(a.subjectId, b.subjectId));

  const usersByState = data.usersByState ?? [];
  const hasUsersByState = usersByState.some((s) => s.count > 0);
  const usersByStateSorted = [...usersByState].filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
  const statePieData = usersByStateSorted.map((s, index) => {
    const code =
      s.stateCode === "International" ? "International" : s.stateCode.trim().toUpperCase();
    const fullName =
      s.stateCode === "International" ? "International" : getUsStateDisplayName(s.stateCode);
    const abbr = s.stateCode === "International" ? "INT" : code;
    return { fullName, abbr, code, value: s.count, fill: regionSliceFill(index) };
  });
  const totalAttributedUsers = statePieData.reduce((sum, row) => sum + row.value, 0);
  const singleRegion = statePieData.length === 1 ? statePieData[0] : null;
  const regionChartHeight =
    singleRegion ? 260 : Math.min(420, 196 + Math.min(statePieData.length, 12) * 18);
  const regionDonutRadii =
    statePieData.length > 14
      ? narrow
        ? { inner: 48, outer: 76 }
        : { inner: 58, outer: 92 }
      : narrow
        ? { inner: 56, outer: 88 }
        : { inner: 68, outer: 104 };

  return (
    <div className="space-y-4">
      {/* KPI strip: two rows of three on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            key: "students",
            label: "Total Students",
            display: countUpStudents.toLocaleString(),
            icon: Users,
            sub: null as string | null,
          },
          {
            key: "subjects",
            label: "Total Subject Enrollments",
            display: countUpSubjects.toLocaleString(),
            icon: BookOpen,
            sub: null as string | null,
          },
          {
            key: "questions",
            label: "Question Bank",
            display: countUpQuestions.toLocaleString(),
            icon: MessageCircle,
            sub: null as string | null,
          },
          {
            key: "states",
            label: "# States with Users",
            display: countUpStates.toLocaleString(),
            icon: MapPin,
            sub: null as string | null,
          },
          {
            key: "quizzes",
            label: "Total Quizzes Taken",
            display: countUpQuizzes.toLocaleString(),
            icon: ClipboardList,
            sub: null as string | null,
          },
          {
            key: "answered",
            label: "Total Questions Answered",
            display: countUpStudentAnswers.toLocaleString(),
            icon: ListChecks,
            sub: null as string | null,
          },
        ].map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
          >
            <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {item.label}
                </CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {item.display}
                </div>
                {item.sub ? (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{item.sub}</p>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Users by inferred region (US state) — donut + legend / single-region hero */}
      {hasUsersByState && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-visible">
            <CardHeader className="pb-2">
              <CardTitle className="dark:text-white">Users by Region</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Inferred from IP —{" "}
                <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                  {totalAttributedUsers.toLocaleString()} {totalAttributedUsers === 1 ? "User" : "Users"}
                </span>{" "}
                across {statesWithUsers} US {statesWithUsers === 1 ? "state" : "states"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 overflow-visible">
              {singleRegion ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-10 py-2">
                  <div className={`relative shrink-0 ${narrow ? "h-[220px] w-[220px]" : "h-[260px] w-[260px]"}`}>
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto absolute inset-0 h-full w-full [&_.recharts-responsive-container]:!h-full [&_.recharts-responsive-container]:!w-full"
                    >
                      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <Pie
                          data={statePieData}
                          dataKey="value"
                          nameKey="abbr"
                          cx="50%"
                          cy="50%"
                          innerRadius={narrow ? "58%" : "60%"}
                          outerRadius={narrow ? "88%" : "90%"}
                          paddingAngle={0}
                          strokeWidth={0}
                          labelLine={false}
                          isAnimationActive={false}
                          label={false}
                        >
                          {statePieData.map((entry) => (
                            <Cell key={`state-${entry.code}`} fill={entry.fill} className="stroke-transparent" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      <span className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                        {singleRegion.value.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-1">
                        users
                      </span>
                    </div>
                  </div>
                  <div className="text-center sm:text-left space-y-3 max-w-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Region</p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-0.5">
                        {singleRegion.fullName}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All attributed signups map to this state so far. When more states appear, you will see a
                      breakdown here.
                    </p>
                    <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                      100% of attributed users
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start min-w-0">
                  <div
                    className="mx-auto w-full max-w-[440px] shrink-0 pt-1 min-w-0"
                    style={{ height: regionChartHeight }}
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto h-full w-full overflow-visible [&_.recharts-responsive-container]:!h-full [&_.recharts-responsive-container]:!w-full [&_.recharts-surface]:overflow-visible [&_.recharts-wrapper]:overflow-visible"
                    >
                      <PieChart
                        margin={{
                          top: narrow ? 44 : 52,
                          bottom: narrow ? 40 : 46,
                          left: narrow ? 68 : 88,
                          right: narrow ? 68 : 88,
                        }}
                      >
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p = payload[0].payload as {
                              fullName: string;
                              abbr: string;
                              value: number;
                              fill?: string;
                            };
                            const pct =
                              totalAttributedUsers > 0
                                ? ((p.value / totalAttributedUsers) * 100).toFixed(1)
                                : "0";
                            return (
                              <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                <div className="font-medium">{p.fullName}</div>
                                <div className="mt-1 text-muted-foreground">
                                  {p.value.toLocaleString()} users · {pct}%
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Pie
                          data={statePieData}
                          dataKey="value"
                          nameKey="abbr"
                          cx="50%"
                          cy="50%"
                          innerRadius={regionDonutRadii.inner}
                          outerRadius={regionDonutRadii.outer}
                          paddingAngle={statePieData.length > 1 ? 0.6 : 0}
                          strokeWidth={0}
                          labelLine={false}
                          isAnimationActive={false}
                          label={(labelProps) => <RegionDonutOutsideLabel {...labelProps} />}
                        >
                          {statePieData.map((entry) => (
                            <Cell key={`state-${entry.code}`} fill={entry.fill} className="stroke-transparent" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <ul
                    className="flex-1 min-w-0 list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 content-start"
                    aria-label="Users by region breakdown"
                  >
                    {statePieData.map((row) => {
                      const pct =
                        totalAttributedUsers > 0 ? (row.value / totalAttributedUsers) * 100 : 0;
                      return (
                        <li
                          key={row.code}
                          className="min-w-0 rounded-md border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 px-2 py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full shadow-sm"
                                style={{ backgroundColor: row.fill }}
                                aria-hidden
                              />
                              <span
                                className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate"
                                title={row.code === "International" ? row.fullName : `${row.fullName} (${row.abbr})`}
                              >
                                {row.fullName}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {row.value.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">
                                {pct >= 0.1 ? `${pct.toFixed(1)}%` : "<0.1%"}
                              </span>
                            </div>
                          </div>
                          <div
                            className="mt-1 h-1 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden"
                            role="presentation"
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                backgroundColor: row.fill,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Average AP Score Lift per Subject — hidden unless SHOW_AVERAGE_AP_SCORE_LIFT_UI; API still returns lift data. */}
      {hasLiftBySubject && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="dark:text-white">Average AP Score Lift per Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-muted-foreground dark:border-slate-700 dark:bg-slate-800/50">
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-right">Average Lift</th>
                      <th className="px-4 py-3 text-right">Enrollments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liftBarRows.map((row) => {
                      const label = getSubjectShortName(row.subjectId);
                      const fullName = fullSubjectName(undefined, row.subjectId);
                      return (
                        <tr
                          key={row.subjectId}
                          className="border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                          title={fullName}
                        >
                          <td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {label}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">
                            {row.averageLift.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {row.count.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Date Range:</span>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted dark:bg-slate-700 dark:hover:bg-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Hero: Cumulative signups */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="dark:bg-slate-900/70 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl dark:text-white">Cumulative Signups Over Time</CardTitle>
            <CardDescription className="dark:text-slate-400">Total Registered Users Over Time</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSignupData ? (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[320px] w-full min-h-0 [&_.recharts-cartesian-grid_line]:stroke-muted/50 [&_.recharts-wrapper]:min-w-0"
              >
                <AreaChart
                  data={data.signUpsOverTime}
                  margin={{ top: 10, right: 10, left: 4, bottom: narrow ? 36 : 28 }}
                >
                  <defs>
                    <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    {...(signupXTicks ? { ticks: signupXTicks, interval: 0 as const } : { minTickGap: 28 })}
                    tick={{ fontSize: narrow ? 10 : 11 }}
                    tickMargin={6}
                    tickFormatter={(v) => formatAxisDate(String(v), narrow)}
                    angle={narrow && signupDates.length > 18 ? -35 : 0}
                    textAnchor={narrow && signupDates.length > 18 ? "end" : "middle"}
                    height={narrow && signupDates.length > 18 ? 48 : 28}
                  />
                  <YAxis tick={{ fontSize: narrow ? 10 : 12 }} width={narrow ? 40 : 52} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as SignUpPoint;
                      return (
                        <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{formatChartDate(p.date)}</div>
                          <div className="mt-1 text-muted-foreground">
                            New: {p.count.toLocaleString()} · Total: {p.cumulative.toLocaleString()}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    fill="url(#cumulativeGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-center text-slate-500 dark:text-slate-400">
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No Signups Yet</p>
                <p className="text-sm mt-1">Cumulative Signups Will Appear Here Once Users Join.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily signups (secondary) – bar chart, same x-axis range as Cumulative */}
      {hasSignupData && data.signUpsOverTime.some((p) => p.count > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="dark:text-white">New Signups Per Day</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Daily Registration Count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[220px] w-full min-h-0 [&_.recharts-cartesian-grid_line]:stroke-muted/50 [&_.recharts-wrapper]:min-w-0"
              >
                <BarChart
                  data={data.signUpsOverTime}
                  margin={{ top: 10, right: 10, left: 4, bottom: narrow ? 40 : 32 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    {...(signupXTicks ? { ticks: signupXTicks, interval: 0 as const } : { minTickGap: 32 })}
                    tick={{ fontSize: narrow ? 10 : 11 }}
                    tickMargin={6}
                    tickFormatter={(v) => formatAxisDate(String(v), narrow)}
                    angle={narrow && signupDates.length > 14 ? -40 : 0}
                    textAnchor={narrow && signupDates.length > 14 ? "end" : "middle"}
                    height={narrow && signupDates.length > 14 ? 52 : 30}
                  />
                  <YAxis tick={{ fontSize: narrow ? 10 : 12 }} width={narrow ? 36 : 48} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-signups)" radius={[4, 4, 0, 0]} name="New Signups" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cumulative subjects enrolled over time */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="dark:bg-slate-900/70 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl dark:text-white">Cumulative Subjects Enrolled Over Time</CardTitle>
            <CardDescription className="dark:text-slate-400">Total Subject Enrollments Over Time</CardDescription>
          </CardHeader>
          <CardContent>
            {hasEnrollmentData ? (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[320px] w-full min-h-0 [&_.recharts-cartesian-grid_line]:stroke-muted/50 [&_.recharts-wrapper]:min-w-0"
              >
                <AreaChart
                  data={enrollmentsOverTime}
                  margin={{ top: 10, right: 10, left: 4, bottom: narrow ? 36 : 28 }}
                >
                  <defs>
                    <linearGradient id="enrollmentCumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 70%, 40%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(200, 70%, 40%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    {...(enrollmentXTicks ? { ticks: enrollmentXTicks, interval: 0 as const } : { minTickGap: 28 })}
                    tick={{ fontSize: narrow ? 10 : 11 }}
                    tickMargin={6}
                    tickFormatter={(v) => formatAxisDate(String(v), narrow)}
                    angle={narrow && enrollmentDates.length > 18 ? -35 : 0}
                    textAnchor={narrow && enrollmentDates.length > 18 ? "end" : "middle"}
                    height={narrow && enrollmentDates.length > 18 ? 48 : 28}
                  />
                  <YAxis tick={{ fontSize: narrow ? 10 : 12 }} width={narrow ? 40 : 52} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as SignUpPoint;
                      return (
                        <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{formatChartDate(p.date)}</div>
                          <div className="mt-1 text-muted-foreground">
                            New: {p.count.toLocaleString()} · Total: {p.cumulative.toLocaleString()}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(200, 70%, 40%)"
                    strokeWidth={2}
                    fill="url(#enrollmentCumulativeGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-center text-slate-500 dark:text-slate-400">
                <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No Enrollment History Yet</p>
                <p className="text-sm mt-1">
                  Enrollment Over Time Will Appear When Enrollment Timestamps Are Available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* New subjects enrolled per day */}
      {hasEnrollmentData && enrollmentsOverTime.some((p) => p.count > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="dark:text-white">New Subjects Enrolled Per Day</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Daily Subject Enrollment Count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[220px] w-full min-h-0 [&_.recharts-cartesian-grid_line]:stroke-muted/50 [&_.recharts-wrapper]:min-w-0"
              >
                <BarChart
                  data={enrollmentsOverTime}
                  margin={{ top: 10, right: 10, left: 4, bottom: narrow ? 40 : 32 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    {...(enrollmentXTicks ? { ticks: enrollmentXTicks, interval: 0 as const } : { minTickGap: 32 })}
                    tick={{ fontSize: narrow ? 10 : 11 }}
                    tickMargin={6}
                    tickFormatter={(v) => formatAxisDate(String(v), narrow)}
                    angle={narrow && enrollmentDates.length > 14 ? -40 : 0}
                    textAnchor={narrow && enrollmentDates.length > 14 ? "end" : "middle"}
                    height={narrow && enrollmentDates.length > 14 ? 52 : 30}
                  />
                  <YAxis tick={{ fontSize: narrow ? 10 : 12 }} width={narrow ? 36 : 48} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(200, 70%, 40%)" radius={[4, 4, 0, 0]} name="New Enrollments" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Course enrollments with display names */}
      {courseEnrollmentsOrdered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="dark:text-white">Enrollments by Subject</CardTitle>
              <CardDescription className="dark:text-slate-400">
                New enrollments per subject with a recorded date in{" "}
                {RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? dateRange}
                {dateRange === "all" ? " (academic year to date)" : ""}. Matches the date range control above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="w-full aspect-auto min-h-0 [&_.recharts-wrapper]:min-w-0"
                style={{ height: Math.max(320, courseEnrollmentsOrdered.length * (narrow ? 32 : 36)) }}
              >
                <BarChart
                  data={courseEnrollmentsOrdered.map((e) => ({
                    ...e,
                    label: chartLabelForSubject(e.displayName, e.subjectId),
                    labelCompact: getSubjectShortName(e.subjectId),
                    fullName: fullSubjectName(e.displayName, e.subjectId),
                  }))}
                  margin={{
                    top: 12,
                    right: narrow ? 8 : 16,
                    left: narrow ? 4 : 8,
                    bottom: 44,
                  }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: narrow ? 10 : 12 }}
                    tickMargin={10}
                    allowDecimals={false}
                    domain={[0, "auto"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="labelCompact"
                    width={narrow ? 100 : 120}
                    interval={0}
                    tick={{ fontSize: narrow ? 10 : 12 }}
                    tickMargin={4}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as CourseEnrollment & { fullName?: string };
                      return (
                        <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{p.fullName ?? chartLabelForSubject(p.displayName, p.subjectId)}</div>
                          <div className="mt-1 text-muted-foreground">Enrollments: {p.count.toLocaleString()}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Enrollments">
                    {courseEnrollmentsOrdered.map((_, index) => (
                      <Cell key={index} fill={getEnrollmentBarShade(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!hasSignupData && courseEnrollmentsOrdered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardContent className="py-5 text-center text-slate-500 dark:text-slate-400">
              No Chart Data Yet. More Activity Will Populate Trends and Distributions.
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
