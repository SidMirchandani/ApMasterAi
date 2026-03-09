import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Target,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getSubjectByCode, getApiCodeForSubject } from "@/subjects";
import { getPredictedAPScoreFromTests } from "@/lib/ap-score-utils";
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
// HELPERS
// =====================
const getUnitStatus = (unitData: any) => {
  if (!unitData) {
    return { bg: "bg-slate-200 dark:bg-slate-700", status: "Not Started", score: 0 };
  }
  const score = unitData.highestScore ?? unitData.mcqScore ?? 0;
  if (score >= 80) return { bg: "bg-emerald-500", status: "Mastered", score };
  if (score >= 60) return { bg: "bg-blue-400", status: "Proficient", score };
  return { bg: "bg-amber-400", status: "In Progress", score };
};

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

  const activeSubjects = subjects.filter((s) => !s.archived);
  const archivedSubjects = subjects.filter((s) => s.archived);

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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 relative">
      <BackgroundDecor />
      <Navigation />

      <main className="py-8 px-4 md:px-8 relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-widest">
                {greeting}
              </p>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                {userProfile?.data?.firstName
                  ? `Welcome back, ${userProfile.data.firstName} 👋`
                  : "Welcome back 👋"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                Continue your personalized AP preparation journey.
              </p>
            </div>
            {activeSubjects.length > 0 && (
              <Button
                onClick={() => router.push("/learn")}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all px-5 h-11 flex-shrink-0"
              >
                <Plus className="mr-2 w-4 h-4" /> Add Course
              </Button>
            )}
          </div>
        </div>

        {subjectsLoading || !subjectsResponse ? (
          <CenteredLoader />
        ) : subjects.length === 0 ? (
          <EmptyState router={router} />
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">
                  My Subjects
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeSubjects.length} course{activeSubjects.length !== 1 ? "s" : ""} enrolled
                </p>
              </div>
              {subjectsFetching && <RefreshingState />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onArchive={() => setSubjectToArchive(subject)}
                  onDelete={() => {
                    setSubjectToRemove(subject);
                    setShowRemoveDialog(true);
                  }}
                  onStudy={() => router.push(`/study?subject=${subject.subjectId}`)}
                />
              ))}
            </div>

            {archivedSubjects.length > 0 && (
              <ArchivedSection
                subjects={archivedSubjects}
                isOpen={isArchiveExpanded}
                toggle={() => setIsArchiveExpanded((v) => !v)}
                onRestore={(s) => archiveMutation.mutate({ id: s.id, archive: false })}
              />
            )}
          </div>
        )}
      </main>

      {/* Delete dialog */}
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
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ======================================================================================
// SUBCOMPONENTS
// ======================================================================================

const BackgroundDecor = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-400/8 rounded-full blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-400/5 rounded-full blur-3xl" />
  </div>
);

const CenteredLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="text-center">
      <div className="relative w-12 h-12 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-200 dark:border-emerald-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Loading...</p>
    </div>
  </div>
);

const EmptyState = ({ router }: { router: any }) => (
  <div className="text-center py-24 px-4">
    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/20 dark:to-emerald-500/10 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60">
      <Sparkles className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
    </div>
    <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
      No subjects yet
    </h2>
    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto font-medium">
      Add AP subjects to start practicing and tracking your progress.
    </p>
    <Button
      onClick={() => router.push("/learn")}
      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 h-12 rounded-xl font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
    >
      <Plus className="mr-2 w-5 h-5" /> Browse Courses
    </Button>
  </div>
);

const RefreshingState = () => (
  <div className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 gap-2">
    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-200 border-t-emerald-500" />
    Refreshing…
  </div>
);

const ErrorScreen = ({ refetch }: { refetch: () => void }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <Navigation />
    <div className="py-12 px-4 max-w-xl mx-auto">
      <Alert className="border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <AlertDescription className="text-rose-700 dark:text-rose-300 flex flex-wrap justify-between items-center gap-3">
          Failed to load your subjects.
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="border-rose-500 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
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
  <div className="mt-6">
    <button
      onClick={toggle}
      className="flex justify-between items-center w-full p-4 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700/50 transition-colors"
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl opacity-80 hover:opacity-100 transition-opacity"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {s.name}
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(s)}
                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl shrink-0"
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

const scoreColorMap: Record<number, { text: string; bg: string; border: string; gradient: string }> = {
  5: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-800", gradient: "from-emerald-500 to-teal-500" },
  4: { text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10", border: "border-green-200 dark:border-green-800", gradient: "from-green-500 to-emerald-500" },
  3: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-800", gradient: "from-amber-500 to-yellow-500" },
  2: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-800", gradient: "from-orange-500 to-amber-500" },
  1: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-800", gradient: "from-rose-500 to-pink-500" },
};

const SubjectCard = ({
  subject,
  onArchive,
  onDelete,
  onStudy,
}: {
  subject: DashboardSubject;
  onArchive: () => void;
  onDelete: () => void;
  onStudy: () => void;
}) => {
  const subjectMeta = getSubjectByCode(subject.subjectId);
  const units = subjectMeta?.units || [];
  const unitProgress = subject.unitProgress || {};

  const { data: testHistoryResponse } = useQuery<{ success: boolean; data: { percentage: number }[] }>({
    queryKey: ["testHistory", subject.subjectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/user/test-history?subjectId=${subject.subjectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });
  const testHistory = testHistoryResponse?.data || [];
  const avgTestPercentage =
    testHistory.length > 0
      ? Math.round(testHistory.reduce((sum, t) => sum + t.percentage, 0) / testHistory.length)
      : 0;
  const hasEnoughForPrediction = testHistory.length >= 1;
  const subjectCode = getApiCodeForSubject(subject.subjectId);
  const predicted = hasEnoughForPrediction ? getPredictedAPScoreFromTests(avgTestPercentage, subjectCode) : null;
  const scoreColors = predicted ? scoreColorMap[predicted.score] : null;

  return (
    <Card className="group flex flex-col h-full overflow-hidden border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl hover:-translate-y-0.5">
      <div
        className={`h-1 w-full bg-gradient-to-r ${
          scoreColors ? scoreColors.gradient : "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600"
        } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
      />
      <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1.5 min-w-0">
            <CardTitle className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {subject.name}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                {formatDate(subjectMeta?.metadata?.examDate || subject.examDate)}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                {subject.units} Units
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8 p-0 rounded-lg" onClick={onArchive} title="Archive">
              <BookOpen className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-8 w-8 p-0 rounded-lg" onClick={onDelete} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 py-4 px-5 flex flex-col gap-4">
        <div className="flex items-stretch gap-3 flex-wrap">
          <div
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-center justify-center gap-1 flex-shrink-0"
            title="Predicted AP Score"
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full text-white text-2xl font-bold shadow-md"
              style={{ backgroundColor: predicted ? predicted.color : "#94a3b8" }}
            >
              {predicted !== null ? predicted.score : "?"}
            </div>
            <APScoreExplainDialog inline triggerClassName="self-start mt-0.5" />
          </div>
          <div className="flex-1 min-w-0 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Unit Progress</p>
            <div className="flex flex-wrap gap-1.5">
            {units.slice(0, 10).map((u: any, i: number) => {
              const unitData = unitProgress[u.id];
              const stat = getUnitStatus(unitData);
              const isMastered = stat.status === "Mastered";
              return (
                <div
                  key={u.id}
                  className={`w-5 h-5 rounded-md ${stat.bg} border border-black/5 dark:border-white/5 flex items-center justify-center transition-transform hover:scale-125 cursor-help`}
                  title={`Unit ${i + 1}: ${stat.status}${stat.score ? ` (${stat.score}%)` : ""}`}
                >
                  {isMastered && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5">
                      <path d="M2 8L5 4L8 7L12 2L16 7L19 4L22 8L19 19H5L2 8Z" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
                    </svg>
                  )}
                </div>
              );
            })}
            {units.length > 10 && <span className="text-[10px] text-slate-400 self-center font-semibold">+{units.length - 10}</span>}
            </div>
          </div>
        </div>
        <div className="pt-1 mt-auto flex flex-col gap-3">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Last studied: <span className="text-slate-500 dark:text-slate-400">{subject.lastStudied ? formatDate(subject.lastStudied) : "Never"}</span>
          </div>
          <Button
            onClick={onStudy}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 h-12 text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] group"
          >
            <span>Continue Practice</span>
            <TrendingUp className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
