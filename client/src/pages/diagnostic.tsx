import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { DiagnosticModal } from "@/components/diagnostic/DiagnosticModal";

export default function DiagnosticPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject)
    ? rawSubject[0] || undefined
    : rawSubject || undefined;

  const [diagnosticInProgress, setDiagnosticInProgress] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && isAuthenticated && !subjectId) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, subjectId, router]);

  // Mark in-progress as soon as subjectId is known
  useEffect(() => {
    if (subjectId && isAuthenticated && !loading) {
      setDiagnosticInProgress(true);
    }
  }, [subjectId, isAuthenticated, loading]);

  // Block accidental page unloads while diagnostic is running
  useEffect(() => {
    if (!diagnosticInProgress) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [diagnosticInProgress]);

  if (loading || !subjectId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    setDiagnosticInProgress(false);
    router.push(`/study?subject=${subjectId}`);
  };

  const handleComplete = async () => {
    // Invalidate caches so results are fresh when user returns to dashboard/subject
    if (subjectId) {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["testHistory", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["dueReviews", subjectId, "all"] });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["subjects"] }),
        queryClient.refetchQueries({ queryKey: ["testHistory", subjectId] }),
        queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] }),
        queryClient.refetchQueries({ queryKey: ["dueReviews", subjectId, "all"] }),
      ]);
    }
  };

  const handleContinuePractice = () => {
    setDiagnosticInProgress(false);
    router.push(`/study?subject=${subjectId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      <Navigation />
      <DiagnosticModal
        subjectId={subjectId}
        onClose={handleClose}
        onComplete={handleComplete}
        onContinuePractice={handleContinuePractice}
      />
    </div>
  );
}
