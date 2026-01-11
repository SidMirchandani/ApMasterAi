import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Clock,
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getSubjectByCode } from "@/subjects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
  console.log('📊 [getUnitStatus] Called with:', {
    hasData: !!unitData,
    unitData: unitData,
    highestScore: unitData?.highestScore,
    mcqScore: unitData?.mcqScore,
    scores: unitData?.scores
  });

  if (!unitData) {
    console.log('⚪ [getUnitStatus] No data -> Not Started');
    return { bg: "bg-gray-200", status: "Not Started", score: 0 };
  }

  const score = unitData.highestScore ?? unitData.mcqScore ?? 0;
  console.log('🎯 [getUnitStatus] Calculated score:', score);
  
  if (score >= 80) {
    console.log('🟢 [getUnitStatus] Mastered (score >= 80)');
    return { bg: "bg-green-600", status: "Mastered", score };
  }
  if (score >= 60) {
    console.log('🟢 [getUnitStatus] Proficient (score >= 60)');
    return { bg: "bg-green-400", status: "Proficient", score };
  }
  console.log('🟠 [getUnitStatus] In Progress (score < 60)');
  return { bg: "bg-orange-400", status: "In Progress", score };
};

// =====================
// MAIN DASHBOARD COMPONENT
// =====================
export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [subjectToRemove, setSubjectToRemove] =
    useState<DashboardSubject | null>(null);
  const [subjectToArchive, setSubjectToArchive] =
    useState<DashboardSubject | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  // =====================
  // FETCH USER PROFILE
  // =====================
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

  // =====================
  // FETCH SUBJECTS
  // =====================
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
    [subjectsResponse?.data],
  );

  const activeSubjects = subjects.filter((s) => !s.archived);
  const archivedSubjects = subjects.filter((s) => s.archived);

  useEffect(() => {
    if (subjectsError && !subjectsLoading) {
      toast({
        title: "Error loading subjects",
        description: subjectsError.message,
        variant: "destructive",
      });
    }
  }, [subjectsError, subjectsLoading]);

  // =====================
  // ARCHIVE MUTATION
  // =====================
  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: any) => {
      const res = await apiRequest("PUT", `/api/user/subjects/${id}`, {
        archived: archive,
      });
      if (!res.ok) throw new Error("Failed archive");
      return res.json();
    },
    onMutate: async ({ id, archive }) => {
      await queryClient.cancelQueries(["subjects"]);
      const prev = queryClient.getQueryData(["subjects"]);

      queryClient.setQueryData(["subjects"], (old: any) => ({
        ...old,
        data: old.data.map((s: any) =>
          String(s.id) === String(id) ? { ...s, archived: archive } : s,
        ),
      }));

      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["subjects"], ctx.prev);
      toast({ title: "Error archiving", variant: "destructive" });
    },
    onSuccess: (_, { archive }) => {
      toast({
        title: archive ? "Archived" : "Restored",
        description: archive ? "Moved to archive" : "Restored",
      });
    },
  });

  // =====================
  // DELETE MUTATION
  // =====================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/user/subjects/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries(["subjects"]);
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
      toast({ title: "Subject removed" });
      setShowRemoveDialog(false);
      setSubjectToRemove(null);
    },
  });

  // =====================
  // NAVIGATION
  // =====================
  if (loading) return <CenteredLoader text="Loading..." />;

  if (!isAuthenticated) return null;

  if (subjectsError && !subjectsLoading)
    return <ErrorScreen refetch={refetchSubjects} />;

  // =====================
  // MAIN UI
  // =====================
  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundDecor />
      <Navigation />

      <main className="py-10 px-4 md:px-8 relative z-10 max-w-6xl mx-auto">
        <Header name={userProfile?.data?.firstName} />

        {subjectsLoading || !subjectsResponse ? (
          <CenteredLoader text="Loading your subjects..." />
        ) : subjects.length === 0 ? (
          <EmptyState router={router} />
        ) : (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">My Subjects</h2>
              <Button
                onClick={() => router.push("/learn")}
                variant="outline"
                className="border-[#36b37e] text-[#36b37e] hover:bg-[#36b37e] hover:text-white transition-colors"
              >
                <Plus className="mr-2 w-4 h-4" /> Add Courses
              </Button>
            </div>

            {subjectsFetching && <RefreshingState />}

            {/* Active subjects */}
            <div className="grid grid-cols-1 gap-6">
              {activeSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onArchive={() => setSubjectToArchive(subject)}
                  onDelete={() => {
                    setSubjectToRemove(subject);
                    setShowRemoveDialog(true);
                  }}
                  onStudy={() =>
                    router.push(`/study?subject=${subject.subjectId}`)
                  }
                />
              ))}
            </div>

            {/* Archived Section */}
            {archivedSubjects.length > 0 && (
              <ArchivedSection
                subjects={archivedSubjects}
                isOpen={isArchiveExpanded}
                toggle={() => setIsArchiveExpanded((v) => !v)}
                onRestore={(s) =>
                  archiveMutation.mutate({ id: s.id, archive: false })
                }
              />
            )}
          </div>
        )}
      </main>

      {/* Delete dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{subjectToRemove?.name}</b>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(String(subjectToRemove?.id))}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive dialog */}
      <AlertDialog
        open={!!subjectToArchive}
        onOpenChange={(v) => !v && setSubjectToArchive(null)}
      >
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <b>{subjectToArchive?.name}</b> to archive?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                archiveMutation.mutate({
                  id: subjectToArchive?.id,
                  archive: true,
                });
                setSubjectToArchive(null);
              }}
              className="bg-khan-blue hover:bg-khan-blue/90"
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
// SUBCOMPONENTS — compact, readable, no logic duplication
// ======================================================================================

const BackgroundDecor = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-10 w-72 h-72 bg-khan-green/5 rounded-full blur-3xl" />
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-khan-blue/5 rounded-full blur-3xl" />
  </div>
);

const Header = ({ name }: { name?: string }) => (
  <div className="mb-8">
    <h1 className="text-2xl sm:text-3xl font-bold text-[#2d3b45] mb-1">
      Welcome back{name ? `, ${name}` : ""}!
    </h1>
    <p className="text-base text-gray-500 font-medium">Continue your personalized AP preparation journey.</p>
  </div>
);

const CenteredLoader = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center py-16">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green mx-auto mb-4" />
      <p>{text}</p>
    </div>
  </div>
);

const EmptyState = ({ router }: { router: any }) => (
  <div className="text-center py-16">
    <BookOpen className="mx-auto h-24 w-24 text-gray-300 mb-6" />
    <h2 className="text-2xl font-bold mb-4">No subjects added yet</h2>
    <p className="text-gray-500 mb-8">Add AP subjects to start</p>
    <Button
      onClick={() => router.push("/learn")}
      className="bg-khan-green text-white px-6"
    >
      <Plus className="mr-2 w-5 h-5" /> Courses
    </Button>
  </div>
);

const RefreshingState = () => (
  <div className="mb-4 text-center">
    <div className="inline-flex items-center text-sm text-gray-500">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-khan-green mr-2" />
      Refreshing...
    </div>
  </div>
);

const ErrorScreen = ({ refetch }: { refetch: () => void }) => (
  <div className="min-h-screen bg-khan-background">
    <Navigation />
    <div className="py-12 px-4">
      <Alert className="mb-8 border-red-300 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-600 flex justify-between items-center">
          Failed to load your subjects.
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="border-red-600 text-red-600"
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
  <div className="mt-8">
    <button
      onClick={toggle}
      className="flex justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
    >
      <h3 className="text-lg font-semibold">
        Archived Subjects ({subjects.length})
      </h3>
      <svg
        className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    {isOpen && (
      <div className="mt-4 space-y-4">
        {subjects.map((s) => (
          <Card
            key={s.id}
            className="bg-gray-50 border-2 border-gray-200 w-full opacity-75"
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{s.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(s)}
                  className="border-[#36b37e] text-[#36b37e] hover:bg-[#36b37e] hover:text-white transition-colors"
                >
                  Restore
                </Button>
              </div>
              <p className="text-gray-600">{s.description}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    )}
  </div>
);

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

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-lg">
      <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-[#2d3b45] tracking-tight">{subject.name}</CardTitle>
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl font-medium">{subject.description}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-khan-blue hover:bg-gray-100 h-8 w-8 p-0"
              onClick={onArchive}
              title="Archive"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-destructive hover:bg-destructive/5 h-8 w-8 p-0"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-6 space-y-6">
        {/* Meta Grid */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 text-gray-600">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <span>{subject.units} Units</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                Exam: {formatDate(subjectMeta?.metadata?.examDate || subject.examDate)}
              </span>
            </div>
          </div>

          {/* Unit Grid */}
          <div className="flex items-center gap-1">
            {units.map((u: any, i: number) => {
              const unitData = unitProgress[u.id];
              const stat = getUnitStatus(unitData);
              
              return (
                <div
                  key={u.id}
                  className={`w-6 h-6 rounded-sm ${stat.bg} border border-black/5 flex items-center justify-center text-[9px] text-white shadow-sm transition-transform hover:scale-110 cursor-help`}
                  title={`Unit ${i + 1}: ${stat.status}${stat.score ? ` (${stat.score}%)` : ""}`}
                >
                  {stat.status === "Mastered" && "👑"}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info + Button */}
        <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> 
              Added {formatDate(subject.dateAdded)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> 
              Last Studied {subject.lastStudied ? formatDate(subject.lastStudied) : "Never"}
            </div>
          </div>

          <Button 
            onClick={onStudy} 
            className="w-full sm:w-auto bg-[#36b37e] hover:bg-[#2fa371] text-white px-6 h-10 font-bold rounded-md shadow-sm transition-all active:scale-95"
          >
            Continue Practice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
