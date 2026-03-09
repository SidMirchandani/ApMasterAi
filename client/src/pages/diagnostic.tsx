import { useEffect } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { DiagnosticModal } from "@/components/diagnostic/DiagnosticModal";
import { Sparkles } from "lucide-react";

export default function DiagnosticPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const rawSubject = router.query.subject;
  const subjectId: string | undefined = Array.isArray(rawSubject)
    ? rawSubject[0] || undefined
    : rawSubject || undefined;

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

  if (loading || !subjectId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-red-200 dark:border-red-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />
      {/* Background landing while modal is open */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-800/50">
          <Sparkles className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Unlock Your Projected AP Score
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm">
          Take our 25-question adaptive diagnostic to see your projected 1–5 score and identify your weakest units.
        </p>
      </div>

      <DiagnosticModal
        subjectId={subjectId}
        onClose={() => router.push(`/analytics?subject=${subjectId}`)}
        onComplete={() => router.push(`/analytics?subject=${subjectId}`)}
      />
    </div>
  );
}
