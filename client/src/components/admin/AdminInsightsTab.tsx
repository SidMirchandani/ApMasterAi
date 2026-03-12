"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Users, Activity, MessageCircle, TrendingUp, Loader2, Calendar, BookOpen } from "lucide-react";
import { SUBJECT_DISPLAY_NAMES, getSubjectDisplayName } from "../../../../lib/subject-display-names";

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

interface InsightsData {
  totalStudents: number;
  activeUsersDAU: number;
  activeUsersMAU: number;
  totalSubjectsEnrolled: number;
  totalQuestionsAnswered: number;
  platformAccuracyRate: number;
  signUpsOverTime: SignUpPoint[];
  enrollmentsOverTime: SignUpPoint[];
  courseEnrollments: CourseEnrollment[];
}

const chartConfig = {
  cumulative: { label: "Total signups", color: "hsl(142, 76%, 36%)" },
  signups: { label: "Sign-ups", color: "hsl(var(--chart-1))" },
  count: { label: "New", color: "hsl(var(--chart-2))" },
  enrollments: { label: "Enrollments", color: "hsl(var(--chart-3))" },
  enrollmentsCumulative: { label: "Total enrollments", color: "hsl(200, 70%, 40%)" },
};

/** Alternating shades of blue (theme) for enrollment bar chart so each subject bar is easy to distinguish. */
const ENROLLMENT_BAR_SHADES = ["hsl(217, 91%, 58%)", "hsl(217, 91%, 48%)"];
function getEnrollmentBarShade(index: number): string {
  return ENROLLMENT_BAR_SHADES[index % ENROLLMENT_BAR_SHADES.length];
}

const RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

function formatChartDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "2-digit" : undefined });
}

/** First-of-month dates in range for x-axis ticks (one marker per month). */
function getMonthlyTicks(dates: string[]): string[] {
  if (dates.length === 0) return [];
  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  const ticks: string[] = [];
  const cur = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(last.getFullYear(), last.getMonth(), 1);
  while (cur <= end) {
    ticks.push(cur.toISOString().slice(0, 10));
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
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

function useCountUp(end: number, durationMs = 1200, enabled = true): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || end === 0) {
      setValue(end);
      return;
    }
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - startTime) / durationMs, 1);
      setValue(Math.round(start + (end - start) * t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, durationMs, enabled]);
  return value;
}

export function AdminInsightsTab({ token }: { token: string }) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");

  // Hooks must run unconditionally before any early return
  const totalStudents = data?.totalStudents ?? 0;
  const totalQuestions = data?.totalQuestionsAnswered ?? 0;
  const totalSubjects = data?.totalSubjectsEnrolled ?? 0;
  const countUpStudents = useCountUp(totalStudents);
  const countUpQuestions = useCountUp(totalQuestions);
  const countUpSubjects = useCountUp(totalSubjects);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const url = `/api/admin/insights${dateRange ? `?range=${dateRange}` : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load insights");
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
  const enrollmentMonthlyTicks =
    enrollmentsOverTime.length > 0
      ? getMonthlyTicks(enrollmentsOverTime.map((p) => p.date))
      : [];

  const monthlyTicks = getMonthlyTicks(data.signUpsOverTime.map((p) => p.date));

  return (
    <div className="space-y-4">
      {/* KPI strip at top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            key: "students",
            label: "Total Students",
            display: countUpStudents.toLocaleString(),
            icon: Users,
          },
          {
            key: "active",
            label: "Active Users (MAU)",
            display: data.activeUsersDAU > 0 ? `${data.activeUsersDAU} / ${data.activeUsersMAU}` : String(data.activeUsersMAU),
            icon: Activity,
          },
          {
            key: "subjects",
            label: "Total Subject Enrollments",
            display: countUpSubjects.toLocaleString(),
            icon: BookOpen,
          },
          {
            key: "questions",
            label: "Total Questions",
            display: countUpQuestions.toLocaleString(),
            icon: MessageCircle,
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
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Range:</span>
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
            <CardTitle className="text-xl dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Cumulative signups over time
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Total registered users over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSignupData ? (
              <ChartContainer
                config={chartConfig}
                className="h-[320px] w-full [&_.recharts-cartesian-grid_line]:stroke-muted/50"
              >
                <AreaChart
                  data={data.signUpsOverTime}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                    ticks={monthlyTicks}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
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
                <p className="font-medium">No signups yet</p>
                <p className="text-sm mt-1">Cumulative signups will appear here once users join.</p>
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
              <CardTitle className="dark:text-white">New signups per day</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Daily registration count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px] w-full [&_.recharts-cartesian-grid_line]:stroke-muted/50">
                <BarChart data={data.signUpsOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    ticks={monthlyTicks}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-signups)" radius={[4, 4, 0, 0]} name="New signups" />
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
            <CardTitle className="text-xl dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Cumulative subjects enrolled over time
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Total subject enrollments over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasEnrollmentData ? (
              <ChartContainer
                config={chartConfig}
                className="h-[320px] w-full [&_.recharts-cartesian-grid_line]:stroke-muted/50"
              >
                <AreaChart
                  data={enrollmentsOverTime}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                    ticks={enrollmentMonthlyTicks}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
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
                <p className="font-medium">No enrollment history yet</p>
                <p className="text-sm mt-1">Enrollment over time will appear when enrollment timestamps are available.</p>
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
              <CardTitle className="dark:text-white">New subjects enrolled per day</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Daily subject enrollment count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px] w-full [&_.recharts-cartesian-grid_line]:stroke-muted/50">
                <BarChart data={enrollmentsOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    ticks={enrollmentMonthlyTicks}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(200, 70%, 40%)" radius={[4, 4, 0, 0]} name="New enrollments" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Course enrollments with display names */}
      {data.courseEnrollments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="dark:text-white">Enrollments by subject</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Students enrolled per course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="w-full"
                style={{ height: Math.max(400, data.courseEnrollments.length * 36) }}
              >
                <BarChart
                  data={data.courseEnrollments.map((e) => ({
                      ...e,
                      label: chartLabelForSubject(e.displayName, e.subjectId),
                      fullName: fullSubjectName(e.displayName, e.subjectId),
                    }))}
                  margin={{ top: 10, right: 10, left: 8, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={260}
                    interval={0}
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
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
                    {data.courseEnrollments.map((_, index) => (
                      <Cell key={index} fill={getEnrollmentBarShade(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!hasSignupData && data.courseEnrollments.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardContent className="py-5 text-center text-slate-500 dark:text-slate-400">
              No chart data yet. More activity will populate trends and distributions.
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
