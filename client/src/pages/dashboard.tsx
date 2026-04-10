import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Target,
  ChevronDown,
  Crown,
  Search,
} from "lucide-react";
import { APScoreCircle } from "@/components/ui/APScoreCircle";
import Navigation from "@/components/ui/navigation";
import { ApMasterLogoMark } from "@/components/ui/ap-master-logo-mark";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getSubjectByCode, getApiCodeForSubject, getUnitWeightsBySectionCode } from "@/subjects";
import { getPredictedAPScoreFromTests, getTargetPercentagesForSubject, getUnitTierFromScore } from "@/lib/ap-score-utils";
import { APScoreExplainDialog } from "@/components/ui/APScoreExplainDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// =====================
// TYPES
// =====================
interface DashboardSubject {
  id: string | number;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  examDate: any;
  progress: number;
  masteryLevel: number;
  lastStudied?: any;
  dateAdded?: any;
  archived?: boolean;
  unitProgress?: any;
}

// =====================
// MAIN DASHBOARD COMPONENT
// =====================
export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [subjectToRemove, setSubjectToRemove] = useState<DashboardSubject | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const archiveSectionRef = useRef<HTMLDivElement>(null);

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/me");
      if (!res.ok) throw new Error("Failed profile");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: adminCheck } = useQuery<{ success: boolean; data: { isAdmin: boolean; experimentalFeaturesEnabled?: boolean } }>({
    queryKey: ["adminCheck"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/admin-check");
      if (!res.ok) return { success: false, data: { isAdmin: false, experimentalFeaturesEnabled: false } };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = adminCheck?.data?.isAdmin ?? false;
  const showAdminFeatures = isAdmin && (adminCheck?.data?.experimentalFeaturesEnabled ?? false);

  const {
    data: subjectsResponse,
    isLoading: subjectsLoading,
    error: subjectsError,
    refetch: refetchSubjects,
    isFetching: subjectsFetching,
  } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/subjects");
      if (!res.ok) throw new Error("Failed subjects");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const subjects: DashboardSubject[] = useMemo(
    () => subjectsResponse?.data || [],
    [subjectsResponse?.data]
  );

  const activeList = useMemo(() => subjects.filter((s) => !s.archived), [subjects]);

  const activeSubjects = useMemo(() => {
    const sorted = [...activeList].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    );
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q));
  }, [activeList, subjectSearch]);
  const archivedSubjects = useMemo(() => {
    const archived = subjects.filter((s) => s.archived);
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return archived;
    return archived.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q));
  }, [subjects, subjectSearch]);

  useEffect(() => {
    if (subjectsError && !subjectsLoading) {
      toast({
        title: "Error loading subjects",
        description: (subjectsError as Error).message,
        variant: "destructive",
      });
    }
  }, [subjectsError, subjectsLoading]);

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: any) => {
      const res = await apiRequest("PUT", `/api/user/subjects/${id}`, { archived: archive });
      if (!res.ok) throw new Error("Failed archive");
      return res.json();
    },
    onMutate: async ({ id, archive }) => {
      await queryClient.cancelQueries({ queryKey: ["subjects"] });
      const prev = queryClient.getQueryData(["subjects"]);
      queryClient.setQueryData(["subjects"], (old: any) => ({
        ...old,
        data: old.data.map((s: any) =>
          String(s.id) === String(id) ? { ...s, archived: archive } : s
        ),
      }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["subjects"], ctx.prev);
      toast({ title: "Error archiving", variant: "destructive" });
    },
    onSuccess: (_, { archive }) => {
      toast({ title: archive ? "Archived" : "Restored" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/user/subjects/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["subjects"] });
      const prev = queryClient.getQueryData(["subjects"]);
      queryClient.setQueryData(["subjects"], (old: any) => ({
        ...old,
        data: old.data.filter((s: any) => String(s.id) !== String(id)),
      }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["subjects"], ctx.prev);
      toast({ title: "Delete failed", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Subject removed" });
      setShowRemoveDialog(false);
      setSubjectToRemove(null);
    },
  });

  if (loading) return <CenteredLoader />;
  if (!isAuthenticated) return null;
  if (subjectsError && !subjectsLoading) return <ErrorScreen refetch={refetchSubjects} />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-7">
        {/* Header */}
        <header className="mb-5 md:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-blue-600/90 dark:text-blue-400/90">
                {greeting}
              </p>
              <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {userProfile?.data?.firstName
                  ? `Welcome back, ${userProfile.data.firstName}`
                  : "Welcome back"}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-[15px]">
                Continue your personalized AP preparation journey.
              </p>
            </div>
            {(activeList.length > 0 || subjects.length > 0) && (
              <div className="flex flex-shrink-0 flex-wrap justify-center gap-2 sm:justify-end">
                <Button
                  onClick={() => archiveSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  View archive
                </Button>
                <Button
                  onClick={() => router.push("/learn")}
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add course
                </Button>
              </div>
            )}
          </div>
        </header>

        {subjectsLoading || !subjectsResponse ? (
          <CenteredLoader />
        ) : subjects.length === 0 ? (
          <EmptyState router={router} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-0.5">
                <h2 className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  Your courses
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activeList.length} active
                  {subjects.filter((s) => s.archived).length > 0 && (
                    <span className="text-slate-400 dark:text-slate-500">
                      {" "}
                      · {subjects.filter((s) => s.archived).length} archived
                    </span>
                  )}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] sm:max-w-md sm:flex-row sm:items-center sm:justify-end">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search courses…"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="h-10 w-full rounded-full border-0 bg-slate-900/[0.04] pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                {subjectsFetching && (
                  <div className="flex justify-center sm:justify-end">
                    <RefreshingState />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              {activeSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  isAdmin={showAdminFeatures}
                  onConfirmArchive={() =>
                    archiveMutation.mutate({ id: subject.id, archive: true })
                  }
                  onDelete={
                    showAdminFeatures
                      ? () => {
                          setSubjectToRemove(subject);
                          setShowRemoveDialog(true);
                        }
                      : undefined
                  }
                  onStudy={() => router.push(`/study?subject=${subject.subjectId}`)}
                  unitProgressOverride={(subject as any).unitProgress}
                />
              ))}
            </div>

            {subjects.length > 0 && (
              <div ref={archiveSectionRef}>
              <ArchivedSection
                subjects={archivedSubjects}
                isOpen={isArchiveExpanded}
                toggle={() => setIsArchiveExpanded((v) => !v)}
                onRestore={(s) => archiveMutation.mutate({ id: s.id, archive: false })}
              />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete dialog (only relevant when experimental features are on) */}
      {showAdminFeatures && (
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-md rounded-2xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{subjectToRemove?.name}</b>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(String(subjectToRemove?.id))}
              className="rounded-xl bg-red-600 shadow-none hover:bg-red-700 hover:shadow-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}

      <SimpleFooter />
    </div>
  );
}

// ======================================================================================
// SUBCOMPONENTS
// ======================================================================================

const CenteredLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="relative mx-auto mb-4 h-11 w-11">
        <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</p>
    </div>
  </div>
);

const EmptyState = ({ router }: { router: any }) => (
  <div className="flex flex-col items-center px-4 py-12 text-center">
    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-violet-500/15 ring-1 ring-blue-500/10 dark:from-blue-500/20 dark:via-blue-400/10 dark:to-violet-500/15 dark:ring-white/10">
      <ApMasterLogoMark size={60} className="rounded-2xl" />
    </div>
    <h2 className="mb-1.5 text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
      Start with a course
    </h2>
    <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-[15px]">
      Add an AP subject to unlock practice, analytics, and a projected score that updates as you improve.
    </p>
    <Button
      onClick={() => router.push("/learn")}
      variant="ghost"
      className="h-11 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600 sm:text-base"
    >
      <Plus className="mr-2 h-5 w-5" /> Browse courses
    </Button>
  </div>
);

const RefreshingState = () => (
  <div className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 gap-2">
    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-200 border-t-blue-500" />
    Refreshing…
  </div>
);

const ErrorScreen = ({ refetch }: { refetch: () => void }) => (
  <div className="min-h-screen bg-white dark:bg-[#0B0F1A]">
    <Navigation />
    <div className="mx-auto max-w-lg px-4 py-12">
      <Alert className="rounded-2xl border-0 bg-red-500/[0.08] text-red-900 shadow-none ring-1 ring-red-500/15 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-red-800 dark:text-red-200/90">
          We couldn&apos;t load your courses.
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="h-9 rounded-full text-red-700 hover:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/20"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
    <SimpleFooter />
  </div>
);

const ArchivedSection = ({
  subjects,
  isOpen,
  toggle,
  onRestore,
}: {
  subjects: DashboardSubject[];
  isOpen: boolean;
  toggle: () => void;
  onRestore: (s: DashboardSubject) => void;
}) => (
  <section className="mt-6 border-t border-slate-200/70 pt-5 dark:border-slate-800/80">
    <button
      type="button"
      onClick={toggle}
      className="group flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:text-blue-600 dark:hover:text-blue-400"
    >
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-inherit">
        Archived courses
        <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">({subjects.length})</span>
      </span>
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-blue-500 dark:group-hover:text-blue-400 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>

    {isOpen && (
      <ul className="mt-3 space-y-0.5">
        {subjects.length === 0 ? (
          <li className="py-3 text-sm text-slate-500 dark:text-slate-400">Nothing in the archive yet.</li>
        ) : (
          subjects.map((s) => (
            <li
              key={s.id}
              className="flex flex-col items-center gap-2.5 rounded-2xl px-3 py-3 text-center transition-colors hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-left"
            >
              <div className="min-w-0 w-full sm:w-auto">
                <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                {s.description ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{s.description}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(s)}
                className="h-9 shrink-0 rounded-full px-4 font-semibold text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/15 sm:self-center"
              >
                Restore
              </Button>
            </li>
          ))
        )}
      </ul>
    )}
  </section>
);

// Shared helper: compute weighted Student Score for prediction so Dashboard matches Analytics logic
function computeStudentScoreForPrediction(params: {
  unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }>;
  testHistory: { percentage: number; sectionBreakdown?: Record<string, { correct: number; total: number }> }[];
  subjectId: string;
}): { studentScore: number; hasEnoughForPrediction: boolean } {
  const { unitProgressMap, testHistory, subjectId } = params;

  const unitBestMap: Record<string, number> = {};
  Object.entries(unitProgressMap).forEach(([code, prog]) => {
    unitBestMap[code] = Math.max(unitBestMap[code] ?? 0, prog.highestScore ?? prog.mcqScore ?? 0);
  });

  const unitPerformanceMap: Record<string, { correct: number; total: number }> = {};
  testHistory.forEach((test) => {
    if (test.sectionBreakdown) {
      Object.entries(test.sectionBreakdown).forEach(([code, section]) => {
        if (!unitPerformanceMap[code]) {
          unitPerformanceMap[code] = { correct: 0, total: 0 };
        }
        unitPerformanceMap[code].correct += section.correct;
        unitPerformanceMap[code].total += section.total;
      });
    }
  });

  Object.entries(unitPerformanceMap).forEach(([code, stats]) => {
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    unitBestMap[code] = Math.max(unitBestMap[code] ?? 0, pct);
  });

  const unitWeights = getUnitWeightsBySectionCode(subjectId);
  const hasWeights = Object.keys(unitWeights).length > 0;

  if (hasWeights && Object.values(unitBestMap).some((v) => v > 0)) {
    const weightedScore = Object.entries(unitWeights).reduce(
      (sum, [code, weight]) => sum + ((unitBestMap[code] ?? 0) / 100) * weight,
      0
    );
    return { studentScore: Math.round(weightedScore), hasEnoughForPrediction: true };
  }

  if (testHistory.length > 0) {
    const last = testHistory[testHistory.length - 1];
    return { studentScore: Math.round(last.percentage), hasEnoughForPrediction: true };
  }

  return { studentScore: 0, hasEnoughForPrediction: false };
}

/* 5-scale: 1=dark red, 2=light red, 3=light green, 4=medium green, 5=dark green */
const scoreColorMap: Record<number, { text: string; bg: string; border: string; gradient: string }> = {
  1: { text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-800", gradient: "from-red-700 to-red-800" },
  2: { text: "text-red-600 dark:text-red-300", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-800", gradient: "from-red-400 to-red-500" },
  3: { text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10", border: "border-green-200 dark:border-green-800", gradient: "from-green-300 to-green-400" },
  4: { text: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/10", border: "border-green-200 dark:border-green-800", gradient: "from-green-500 to-green-600" },
  5: { text: "text-green-800 dark:text-green-200", bg: "bg-green-50 dark:bg-green-500/10", border: "border-green-200 dark:border-green-800", gradient: "from-green-700 to-green-800" },
};

const SubjectCard = ({
  subject,
  isAdmin,
  onConfirmArchive,
  onDelete,
  onStudy,
  unitProgressOverride,
}: {
  subject: DashboardSubject;
  isAdmin?: boolean;
  onConfirmArchive: () => void;
  onDelete?: () => void;
  onStudy: () => void;
  /** Optional unit progress map passed from parent to avoid extra network calls. */
  unitProgressOverride?: Record<string, { highestScore?: number; mcqScore?: number }>;
}) => {
  const subjectMeta = getSubjectByCode(subject.subjectId);
  const units = subjectMeta?.units || [];
  const unitCount = subject.units ?? units.length;

  const { data: testHistoryResponse } = useQuery<{
    success: boolean;
    data: { percentage: number; type?: "full-length" | "diagnostic"; sectionBreakdown?: Record<string, { correct: number; total: number }> }[];
  }>({
    queryKey: ["testHistory", subject.subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/test-history?subjectId=${subject.subjectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });
  const testHistory = testHistoryResponse?.data || [];

  // Prefer unit progress that is already embedded on the subject (from /api/user/subjects)
  // to avoid an extra request per subject. Fall back to an empty map.
  const unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }> =
    unitProgressOverride || (subject as any).unitProgress || {};

  const subjectCode = getApiCodeForSubject(subject.subjectId);
  const targets = getTargetPercentagesForSubject(subjectCode);
  const { studentScore, hasEnoughForPrediction } = computeStudentScoreForPrediction({
    unitProgressMap,
    testHistory,
    subjectId: subject.subjectId,
  });
  const predicted = hasEnoughForPrediction ? getPredictedAPScoreFromTests(studentScore, subjectCode) : null;
  const scoreColors = predicted ? scoreColorMap[predicted.score] : null;

  const description = subject.description || subjectMeta?.metadata?.description || "";
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-white shadow-none ring-1 ring-slate-200 transition-colors duration-200 hover:ring-slate-300 dark:bg-slate-900/40 dark:ring-white/[0.08] dark:hover:ring-white/[0.12] sm:rounded-3xl">
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-4 text-center sm:w-[8.75rem] sm:shrink-0 sm:gap-1.5 sm:px-2.5 sm:py-4 sm:rounded-2xl ${
            scoreColors ? scoreColors.bg : "bg-slate-100 dark:bg-white/[0.06]"
          }`}
          title="Predicted AP Score"
        >
          <div className="flex w-full flex-col items-center gap-2 sm:w-full">
            <APScoreCircle
              score={predicted?.score ?? null}
              color={predicted ? predicted.color : "#94a3b8"}
              size="lg"
              responsive
            />
            <APScoreExplainDialog inline triggerClassName="self-center" />
          </div>
          <p className="max-w-[11rem] text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400 sm:max-w-none">
            Projected AP score
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <h3 className="font-display text-base font-bold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-lg">
                {subject.name}
              </h3>
              {description ? (
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
              ) : null}
            </div>
            <div className="flex min-w-0 w-full shrink-0 flex-wrap items-center justify-center gap-2 self-stretch sm:w-auto sm:justify-end sm:gap-1 sm:self-auto">
              {/* Fixed max width + stacked layers so switching states doesn’t shift the title or delete control */}
              <div className="grid h-9 min-w-0 w-full max-w-[min(100%,220px)] grid-cols-1 grid-rows-1 place-items-center sm:w-[220px] sm:max-w-none sm:place-items-end">
                <div
                  className={`col-start-1 row-start-1 flex h-full w-full items-center justify-center transition-opacity duration-300 ease-out sm:justify-end ${
                    archiveConfirm ? "pointer-events-none opacity-0" : "opacity-100"
                  }`}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setArchiveConfirm(true)}
                    title="Archive"
                    className="h-9 rounded-full px-3 text-xs font-medium text-slate-600 shadow-none hover:bg-slate-900/[0.05] hover:shadow-none dark:text-slate-400 dark:hover:bg-white/[0.06]"
                  >
                    Archive
                  </Button>
                </div>
                <div
                  className={`col-start-1 row-start-1 flex h-full w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-medium text-blue-600 transition-opacity duration-300 ease-out dark:text-blue-400 sm:flex-nowrap sm:justify-end ${
                    archiveConfirm ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <span className="whitespace-nowrap">Are you sure?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmArchive();
                      setArchiveConfirm(false);
                    }}
                    className="rounded-full px-2 py-1 text-blue-600 underline-offset-2 transition-colors hover:bg-blue-500/10 hover:underline dark:text-blue-400"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveConfirm(false)}
                    className="rounded-full px-2 py-1 text-blue-600 underline-offset-2 transition-colors hover:bg-blue-500/10 hover:underline dark:text-blue-400"
                  >
                    No
                  </button>
                </div>
              </div>
              {isAdmin && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 text-slate-400 shadow-none hover:bg-red-500/10 hover:text-red-600 hover:shadow-none dark:hover:text-red-400"
                  onClick={onDelete}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs text-slate-500 dark:text-slate-400 sm:justify-start sm:text-left sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-4 w-4 shrink-0 opacity-70" />
              {unitCount} units
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0 opacity-70" />
              Exam {formatDate(subjectMeta?.metadata?.examDate || subject.examDate)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 w-full space-y-1.5 sm:flex-1">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 sm:text-left text-center">
                Unit progress
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                {units.slice(0, 10).map((u: { id: string }, i: number) => {
                  const unitData = unitProgressMap[u.id];
                  const score = unitData?.highestScore ?? unitData?.mcqScore ?? 0;
                  const stat = getUnitTierFromScore(score, targets);
                  const isMastered = stat.tier === "5";
                  return (
                    <div
                      key={u.id}
                      className={`flex h-6 w-6 cursor-help items-center justify-center rounded-full ${stat.bg} ring-1 ring-black/[0.04] transition-transform hover:scale-110 dark:ring-white/[0.08]`}
                      title={`Unit ${i + 1}: ${stat.label}${score > 0 ? ` (${score}%)` : ""}`}
                    >
                      {isMastered && (
                        <Crown className="h-3 w-3 fill-[#FFD700] stroke-[#FFD700]" strokeWidth={2} aria-hidden />
                      )}
                    </div>
                  );
                })}
                {units.length > 10 && (
                  <span className="self-center pl-1 text-xs font-medium text-slate-400">+{units.length - 10}</span>
                )}
              </div>
            </div>
            <Button
              onClick={onStudy}
              title={testHistory.length === 0 ? "Start practice" : "Continue practice"}
              variant="ghost"
              className="group/btn h-10 shrink-0 self-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 hover:text-white dark:bg-blue-500 dark:hover:bg-blue-600 sm:self-end sm:px-5"
            >
              <span className="md:hidden">{testHistory.length === 0 ? "Start" : "Practice"}</span>
              <span className="hidden md:inline">{testHistory.length === 0 ? "Start practice" : "Continue practice"}</span>
              <ArrowRight
                className="ml-2 h-4 w-4 shrink-0 transition-transform group-hover/btn:translate-x-0.5"
                aria-hidden
              />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};
