import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
  Target,
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
  Play,
  BarChart3,
  Flame,
  Star,
  ArrowRight,
  Archive,
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
} from "@/components/ui/alert-dialog";

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

const getUnitStatus = (unitData: any) => {
  if (!unitData) {
    return { bg: "bg-gray-200", status: "Not Started", score: 0 };
  }
  const score = unitData.highestScore ?? unitData.mcqScore ?? 0;
  if (score >= 80) return { bg: "bg-[#36b37e]", status: "Mastered", score };
  if (score >= 60) return { bg: "bg-[#57d9a3]", status: "Proficient", score };
  return { bg: "bg-amber-400", status: "In Progress", score };
};

const motivationalTips = [
  { title: "Consistency is Key", desc: "Just 30 minutes of daily practice can dramatically improve your scores.", icon: Flame },
  { title: "Active Recall", desc: "Testing yourself is more effective than passive review. Keep practicing!", icon: Zap },
  { title: "Take Breaks", desc: "The Pomodoro technique can help: 25 min study, 5 min break.", icon: Clock },
  { title: "Stay Positive", desc: "Every mistake is a learning opportunity. You're making progress!", icon: Star },
];

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [subjectToRemove, setSubjectToRemove] = useState<DashboardSubject | null>(null);
  const [subjectToArchive, setSubjectToArchive] = useState<DashboardSubject | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [dailyTip] = useState(() => motivationalTips[Math.floor(Math.random() * motivationalTips.length)]);

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

  const totalUnits = activeSubjects.reduce((acc, s) => acc + (s.units || 0), 0);
  const masteredUnits = activeSubjects.reduce((acc, s) => {
    const meta = getSubjectByCode(s.subjectId);
    const units = meta?.units || [];
    const progress = s.unitProgress || {};
    return acc + units.filter((u: any) => {
      const data = progress[u.id];
      return data && (data.highestScore ?? data.mcqScore ?? 0) >= 80;
    }).length;
  }, 0);

  const overallProgress = totalUnits > 0 ? Math.round((masteredUnits / totalUnits) * 100) : 0;

  useEffect(() => {
    if (subjectsError && !subjectsLoading) {
      toast({
        title: "Error loading subjects",
        description: (subjectsError as Error).message,
        variant: "destructive",
      });
    }
  }, [subjectsError, subjectsLoading, toast]);

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
        data: old.data.map((s: any) => String(s.id) === String(id) ? { ...s, archived: archive } : s),
      }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["subjects"], ctx.prev);
      toast({ title: "Error archiving", variant: "destructive" });
    },
    onSuccess: (_, { archive }) => {
      toast({ title: archive ? "Archived" : "Restored", description: archive ? "Moved to archive" : "Restored" });
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
      toast({ title: "Subject removed" });
      setShowRemoveDialog(false);
      setSubjectToRemove(null);
    },
  });

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return null;
  if (subjectsError && !subjectsLoading) return <ErrorScreen refetch={refetchSubjects} />;

  const firstName = userProfile?.data?.firstName;
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2d3b45] mb-1">
            {greeting}{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-gray-500 font-medium">
            {activeSubjects.length > 0 
              ? "Here's your personalized study dashboard."
              : "Get started by adding your first AP course below."}
          </p>
        </div>

        {subjectsLoading ? (
          <LoadingState />
        ) : activeSubjects.length === 0 ? (
          <EmptyDashboard router={router} />
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={BookOpen}
                label="Active Courses"
                value={activeSubjects.length}
                color="blue"
              />
              <StatCard
                icon={Target}
                label="Total Units"
                value={totalUnits}
                color="purple"
              />
              <StatCard
                icon={Award}
                label="Units Mastered"
                value={masteredUnits}
                color="green"
              />
              <StatCard
                icon={TrendingUp}
                label="Overall Progress"
                value={`${overallProgress}%`}
                color="orange"
                showProgress
                progress={overallProgress}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Courses */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#2d3b45]">My Courses</h2>
                  <Button
                    onClick={() => router.push("/learn")}
                    size="sm"
                    className="bg-[#36b37e] hover:bg-[#2fa371] text-white font-bold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Course
                  </Button>
                </div>

                <div className="space-y-4">
                  {activeSubjects.map((subject) => (
                    <CourseCard
                      key={subject.id}
                      subject={subject}
                      onStudy={() => router.push(`/study?subject=${subject.subjectId}`)}
                      onArchive={() => setSubjectToArchive(subject)}
                      onDelete={() => {
                        setSubjectToRemove(subject);
                        setShowRemoveDialog(true);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Daily Tip Card */}
                <Card className="border border-gray-200 bg-gradient-to-br from-[#36b37e]/5 to-[#36b37e]/10 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#36b37e]/20 flex items-center justify-center">
                        <dailyTip.icon className="w-5 h-5 text-[#36b37e]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#36b37e] uppercase tracking-wider">Daily Tip</p>
                        <CardTitle className="text-base font-bold text-[#2d3b45]">{dailyTip.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 leading-relaxed">{dailyTip.desc}</p>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-[#2d3b45] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <QuickActionButton
                      icon={Play}
                      label="Continue Last Session"
                      onClick={() => activeSubjects[0] && router.push(`/study?subject=${activeSubjects[0].subjectId}`)}
                    />
                    <QuickActionButton
                      icon={BarChart3}
                      label="View Full-Length Tests"
                      onClick={() => activeSubjects[0] && router.push(`/full-length-history?subject=${activeSubjects[0].subjectId}`)}
                    />
                    <QuickActionButton
                      icon={BookOpen}
                      label="Browse All Courses"
                      onClick={() => router.push("/learn")}
                    />
                  </CardContent>
                </Card>

                {/* Upcoming Exams */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-[#2d3b45] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Upcoming Exams
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeSubjects.slice(0, 3).map((subject) => {
                      const meta = getSubjectByCode(subject.subjectId);
                      const examDate = meta?.metadata?.examDate || subject.examDate;
                      return (
                        <div key={subject.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[#2d3b45] truncate max-w-[140px]">{subject.name}</span>
                          <span className="text-gray-500 text-xs font-bold">{formatDate(examDate)}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{subjectToRemove?.name}</b>? This cannot be undone.
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

      {/* Archive Dialog */}
      <AlertDialog open={!!subjectToArchive} onOpenChange={(v) => !v && setSubjectToArchive(null)}>
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
                archiveMutation.mutate({ id: subjectToArchive?.id, archive: true });
                setSubjectToArchive(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  showProgress, 
  progress 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: string;
  showProgress?: boolean;
  progress?: number;
}) {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
    green: { bg: "bg-[#36b37e]/5", text: "text-[#36b37e]", iconBg: "bg-[#36b37e]/10" },
    orange: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
  };

  const c = colors[color] || colors.blue;

  return (
    <Card className={`border border-gray-200 ${c.bg}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
          <span className={`text-2xl font-black ${c.text}`}>{value}</span>
        </div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        {showProgress && progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2 bg-gray-200" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseCard({ 
  subject, 
  onStudy, 
  onArchive, 
  onDelete 
}: { 
  subject: DashboardSubject; 
  onStudy: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const subjectMeta = getSubjectByCode(subject.subjectId);
  const units = subjectMeta?.units || [];
  const unitProgress = subject.unitProgress || {};

  const masteredCount = units.filter((u: any) => {
    const data = unitProgress[u.id];
    return data && (data.highestScore ?? data.mcqScore ?? 0) >= 80;
  }).length;

  const progressPercent = units.length > 0 ? Math.round((masteredCount / units.length) * 100) : 0;

  return (
    <Card className="border border-gray-200 bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        {/* Left colored bar */}
        <div className="w-full sm:w-2 h-2 sm:h-auto bg-gradient-to-b from-[#36b37e] to-[#2fa371]" />
        
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[#2d3b45] mb-1 truncate">{subject.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{subject.description}</p>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                onClick={onArchive}
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">{masteredCount} of {units.length} units mastered</span>
                <span className="font-bold text-[#36b37e]">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-gray-100" />
            </div>

            <Button
              onClick={onStudy}
              className="bg-[#36b37e] hover:bg-[#2fa371] text-white font-bold px-5 shadow-sm group-hover:shadow-md transition-all"
            >
              Study <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Exam: {formatDate(subjectMeta?.metadata?.examDate || subject.examDate)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last studied: {subject.lastStudied ? formatDate(subject.lastStudied) : "Never"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickActionButton({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <span className="text-sm font-medium text-[#2d3b45]">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#36b37e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#36b37e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading your courses...</p>
      </div>
    </div>
  );
}

function EmptyDashboard({ router }: { router: any }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border border-gray-200 bg-white text-center py-16 px-8">
        <div className="w-20 h-20 rounded-full bg-[#36b37e]/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-[#36b37e]" />
        </div>
        <h2 className="text-2xl font-bold text-[#2d3b45] mb-3">Start Your AP Journey</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
          Add your first AP course to get personalized study plans, practice tests, and progress tracking.
        </p>
        <Button
          onClick={() => router.push("/learn")}
          size="lg"
          className="bg-[#36b37e] hover:bg-[#2fa371] text-white font-bold px-8 shadow-lg shadow-[#36b37e]/20"
        >
          <Plus className="w-5 h-5 mr-2" /> Browse Courses
        </Button>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <FeaturePreview
          icon={Target}
          title="Adaptive Practice"
          desc="Questions adjust to your skill level"
        />
        <FeaturePreview
          icon={TrendingUp}
          title="Track Progress"
          desc="See your improvement over time"
        />
        <FeaturePreview
          icon={Award}
          title="Master Units"
          desc="Unlock achievements as you learn"
        />
      </div>
    </div>
  );
}

function FeaturePreview({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <Card className="border border-gray-200 p-5 text-center">
      <div className="w-10 h-10 rounded-lg bg-[#36b37e]/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-[#36b37e]" />
      </div>
      <h3 className="font-bold text-[#2d3b45] text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{desc}</p>
    </Card>
  );
}

function ErrorScreen({ refetch }: { refetch: () => void }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navigation />
      <div className="max-w-2xl mx-auto py-20 px-4">
        <Card className="border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-6">We couldn't load your dashboard. Please try again.</p>
          <Button onClick={refetch} variant="outline" className="border-red-500 text-red-600 hover:bg-red-100">
            Try Again
          </Button>
        </Card>
      </div>
    </div>
  );
}
