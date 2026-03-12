import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Target,
  ChevronDown,
  Sparkles,
  Crown,
  Search,
} from "lucide-react";
import { APScoreCircle } from "@/components/ui/APScoreCircle";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getSubjectByCode, getApiCodeForSubject } from "@/subjects";
import { getPredictedAPScoreFromTests, computeProjectedPercentage, getTargetPercentagesForSubject, getUnitTierFromScore } from "@/lib/ap-score-utils";
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
  const [subjectToArchive, setSubjectToArchive] = useState<DashboardSubject | null>(null);
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
  const activeSubjectIds = useMemo(() => activeList.map((s) => s.subjectId), [activeList]);

  const testHistoryQueries = useQueries({
    queries: activeSubjectIds.map((subjectId) => ({
      queryKey: ["testHistory", subjectId],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/user/test-history?subjectId=${subjectId}`);
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
      staleTime: 60000,
      enabled: isAuthenticated && activeSubjectIds.length > 0,
    })),
  });

  const unitProgressQueries = useQueries({
    queries: activeSubjectIds.map((subjectId) => ({
      queryKey: ["unitProgress", subjectId],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/user/subjects/${subjectId}/unit-progress`);
        if (!res.ok) throw new Error("Failed");
        return res.json();
      },
      staleTime: 60000,
      enabled: isAuthenticated && activeSubjectIds.length > 0,
    })),
  });

  const hasProjectedScoreMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    activeSubjectIds.forEach((subjectId, i) => {
      const thRes = testHistoryQueries[i]?.data as { data?: unknown[] } | undefined;
      const testHistory = Array.isArray(thRes?.data) ? thRes.data : [];
      const upRes = unitProgressQueries[i]?.data as { data?: Record<string, { highestScore?: number; mcqScore?: number }> } | undefined;
      const unitProgressMap = upRes?.data && typeof upRes.data === "object" && !Array.isArray(upRes.data) ? upRes.data : {};
      const { hasEnoughForPrediction } = computeProjectedPercentage({ unitProgressMap, testHistory });
      map[subjectId] = hasEnoughForPrediction;
    });
    return map;
  }, [activeSubjectIds, testHistoryQueries, unitProgressQueries]);

  const activeSubjects = useMemo(() => {
    const sorted = [...activeList].sort((a, b) => {
      const aHas = hasProjectedScoreMap[a.subjectId] ?? false;
      const bHas = hasProjectedScoreMap[b.subjectId] ?? false;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
    });
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q));
  }, [activeList, subjectSearch, hasProjectedScoreMap]);
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] relative">
      <BackgroundDecor />
      <Navigation />

      <main className="py-5 px-4 md:px-8 relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-widest">
                {greeting}
              </p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                {userProfile?.data?.firstName
                  ? `Welcome back, ${userProfile.data.firstName} 👋`
                  : "Welcome back 👋"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                Continue your personalized AP preparation journey.
              </p>
            </div>
            {(activeList.length > 0 || subjects.length > 0) && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {subjects.filter((s) => s.archived).length > 0 && (
                  <Button
                    onClick={() => archiveSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-150 ease-out px-4 h-9 text-xs flex-shrink-0"
                  >
                    <BookOpen className="mr-1.5 w-3.5 h-3.5" /> Go to Archive
                  </Button>
                )}
                {activeList.length > 0 && (
                  <Button
                    onClick={() => router.push("/learn")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] px-4 h-9 text-xs flex-shrink-0"
                  >
                    <Plus className="mr-1.5 w-3.5 h-3.5" /> Add Course
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {subjectsLoading || !subjectsResponse ? (
          <CenteredLoader />
        ) : subjects.length === 0 ? (
          <EmptyState router={router} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">
                  My Subjects
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeList.length} active course{activeList.length !== 1 ? "s" : ""}
                  {subjects.filter((s) => s.archived).length > 0 && (
                    <>, {subjects.filter((s) => s.archived).length} archived</>
                  )}
                </p>
              </div>
              <div className="flex-1 min-w-[200px] max-w-sm flex items-center justify-center">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {subjectsFetching && <RefreshingState />}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  isAdmin={isAdmin}
                  onArchive={() => setSubjectToArchive(subject)}
                  onDelete={
                    isAdmin
                      ? () => {
                          setSubjectToRemove(subject);
                          setShowRemoveDialog(true);
                        }
                      : undefined
                  }
                  onStudy={() => router.push(`/study?subject=${subject.subjectId}`)}
                />
              ))}
            </div>

            {archivedSubjects.length > 0 && (
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

      {/* Delete dialog (only relevant when user is admin) */}
      {isAdmin && (
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="rounded-2xl max-w-md">
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
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}

      {/* Archive dialog */}
      <AlertDialog open={!!subjectToArchive} onOpenChange={(v) => !v && setSubjectToArchive(null)}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <b>{subjectToArchive?.name}</b> to archive? You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                archiveMutation.mutate({ id: subjectToArchive?.id, archive: true });
                setSubjectToArchive(null);
              }}
              className="bg-blue-500 hover:bg-blue-600 rounded-xl"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SimpleFooter />
    </div>
  );
}

// ======================================================================================
// SUBCOMPONENTS
// ======================================================================================

const BackgroundDecor = () => null;

const CenteredLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="relative w-12 h-12 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Loading...</p>
    </div>
  </div>
);

const EmptyState = ({ router }: { router: any }) => (
  <div className="text-center py-12 px-4">
    <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60">
      <Sparkles className="h-10 w-10 text-blue-600 dark:text-blue-400" />
    </div>
    <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
      No subjects yet
    </h2>
    <p className="text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto font-medium">
      Add AP subjects to start practicing and tracking your progress.
    </p>
    <Button
      onClick={() => router.push("/learn")}
      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 h-12 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]"
    >
      <Plus className="mr-2 w-5 h-5" /> Browse Courses
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
  <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
    <Navigation />
<div className="py-8 px-4 max-w-xl mx-auto">
        <Alert className="border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-500/10 rounded-2xl">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700 dark:text-red-300 flex flex-wrap justify-between items-center gap-3">
          Failed to load your subjects.
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="border-red-500 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
          >
            Try Again
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
  <div className="mt-4">
    <button
      onClick={toggle}
      className="flex justify-between items-center w-full p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-800 transition-all duration-150 ease-out"
    >
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Archived ({subjects.length})
      </span>
      <ChevronDown
        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>

    {isOpen && (
      <div className="mt-3 space-y-3">
        {subjects.map((s) => (
          <Card
            key={s.id}
            className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl opacity-80 hover:opacity-100 transition-all duration-150 ease-out"
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {s.name}
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(s)}
                  className="border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl shrink-0 transition-all duration-150 ease-out"
                >
                  Restore
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )}
  </div>
);

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
  onArchive,
  onDelete,
  onStudy,
}: {
  subject: DashboardSubject;
  isAdmin?: boolean;
  onArchive: () => void;
  onDelete?: () => void;
  onStudy: () => void;
}) => {
  const router = useRouter();
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

  const { data: unitProgressResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["unitProgress", subject.subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/subjects/${subject.subjectId}/unit-progress`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });
  const unitProgressMap: Record<string, { highestScore?: number; mcqScore?: number }> =
    unitProgressResponse?.data || {};

  const subjectCode = getApiCodeForSubject(subject.subjectId);
  const targets = getTargetPercentagesForSubject(subjectCode);
  const { projectedPercentage, hasEnoughForPrediction } = computeProjectedPercentage({
    unitProgressMap,
    testHistory,
  });
  const predicted = hasEnoughForPrediction ? getPredictedAPScoreFromTests(projectedPercentage, subjectCode) : null;
  const scoreColors = predicted ? scoreColorMap[predicted.score] : null;

  const description = subject.description || subjectMeta?.metadata?.description || "";

  return (
    <Card className="group flex flex-row h-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-[1px] hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-150 ease-out bg-white dark:bg-slate-900/60 rounded-xl">
      {/* Left: Predicted AP Score + Percentile (big box) */}
      <div
        className={`flex-shrink-0 w-36 sm:w-40 flex flex-col items-center justify-center gap-2 p-4 rounded-l-xl border-r border-slate-200 dark:border-slate-800 ${
          scoreColors ? scoreColors.bg : "bg-slate-100 dark:bg-slate-800/80"
        }`}
      >
        <div className="flex flex-col items-center gap-1.5" title="Predicted AP Score">
          <APScoreCircle
            score={predicted?.score ?? null}
            color={predicted ? predicted.color : "#94a3b8"}
            size="lg"
          />
          <APScoreExplainDialog inline triggerClassName="self-center" />
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Projected</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">AP Score</p>
        </div>
      </div>

      {/* Right: Title, description, metadata, actions */}
      <div className="flex-1 min-w-0 flex flex-col">
        <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-0.5 min-w-0">
              <CardTitle className="text-base font-display font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {subject.name}
              </CardTitle>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8 p-0 rounded-lg" onClick={onArchive} title="Archive">
                <BookOpen className="w-3.5 h-3.5" />
              </Button>
              {isAdmin && onDelete && (
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg" onClick={onDelete} title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 py-2.5 px-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 flex-shrink-0" />
              {unitCount} Units
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              Exam: {formatDate(subjectMeta?.metadata?.examDate || subject.examDate)}
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Unit Progress</p>
              <div className="flex flex-wrap gap-1 items-center">
                {units.slice(0, 10).map((u: { id: string }, i: number) => {
                  const unitData = unitProgressMap[u.id];
                  const score = unitData?.highestScore ?? unitData?.mcqScore ?? 0;
                  const stat = getUnitTierFromScore(score, targets);
                  const isMastered = stat.tier === "5";
                  return (
                    <div
                      key={u.id}
                      className={`w-5 h-5 rounded-md ${stat.bg} border border-black/5 dark:border-white/5 flex items-center justify-center transition-transform hover:scale-125 cursor-help`}
                      title={`Unit ${i + 1}: ${stat.label}${score > 0 ? ` (${score}%)` : ""}`}
                    >
                      {isMastered && (
                        <Crown className="w-2.5 h-2.5 fill-[#FFD700] stroke-[#FFD700]" strokeWidth={2} aria-hidden />
                      )}
                    </div>
                  );
                })}
                {units.length > 10 && <span className="text-[10px] text-slate-400 self-center font-semibold">+{units.length - 10}</span>}
              </div>
            </div>
            {!predicted ? (
              <Button
                onClick={() => router.push(`/diagnostic?subject=${subject.subjectId}`)}
                title="Take the diagnostic test to get your projected AP score and identify units to focus on"
                className="flex-shrink-0 bg-rose-500 hover:bg-rose-600 text-white py-2.5 h-9 px-3 sm:px-4 text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] group"
              >
                <Sparkles className="w-4 h-4 mr-1.5 flex-shrink-0" aria-hidden />
                <span className="md:hidden">Diagnostic</span>
                <span className="hidden md:inline">Take Diagnostic Test</span>
              </Button>
            ) : (
              <Button
                onClick={onStudy}
                title="Continue Practice"
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-2.5 h-9 px-3 sm:px-4 text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] group"
              >
                <span className="md:hidden">Practice</span>
                <span className="hidden md:inline">Continue Practice</span>
                <ArrowRight className="w-4 h-4 ml-1.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
