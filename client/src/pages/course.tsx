import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Target, Users, Plus, ArrowLeft } from "lucide-react";
import { getSubjectByLegacyId } from "@/subjects";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Course() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  const handleAddCourse = async () => {
    if (!id || typeof id !== "string") return;

    setIsAdding(true);
    try {
      const subject = getSubjectByLegacyId(id);
      if (!subject) {
        toast({
          title: "Error",
          description: "Subject not found",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest("POST", "/api/user/subjects", {
        subjectId: subject.subjectCode,
        name: subject.displayName,
        description: subject.metadata.description,
        units: subject.units.length,
        examDate: subject.metadata.examDate,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${subject.displayName} added to your dashboard!`,
        });
        router.push("/dashboard");
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to add course",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to add course",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0B0F1A]">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-11 w-11">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200/80 dark:border-blue-900/60" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getCourseName = (courseId: string) => {
    const courseMap: Record<string, string> = {
      "calculus-ab": "AP Calculus AB",
      "calculus-bc": "AP Calculus BC",
      biology: "AP Biology",
      chemistry: "AP Chemistry",
      "physics-1": "AP Physics 1",
      "us-history": "AP U.S. History",
      "world-history": "AP World History",
      "english-language": "AP English Language",
      "english-literature": "AP English Literature",
      psychology: "AP Psychology",
    };
    return courseMap[courseId] || "AP Course";
  };

  const courseId: string = Array.isArray(id) ? (id[0] || "") : (id || "");
  const courseName: string = getCourseName(courseId);

  const features = [
    {
      icon: Target,
      title: "Practice questions",
      desc: "Real AP-style problems and solutions",
      iconBg: "bg-blue-600 text-white dark:bg-blue-500",
    },
    {
      icon: BookOpen,
      title: "Detailed explanations",
      desc: "Comprehensive answer explanations",
      iconBg: "bg-emerald-600 text-white dark:bg-emerald-500",
    },
    {
      icon: Clock,
      title: "Timed practice",
      desc: "Exam simulation with real timing",
      iconBg: "bg-violet-600 text-white dark:bg-violet-500",
    },
  ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0B0F1A]">
      <Navigation />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1 mb-6 h-10 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          asChild
        >
          <Link href="/learn">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Browse courses
          </Link>
        </Button>

        <header className="mb-8 space-y-2">
          <p className="text-sm font-medium text-blue-600/90 dark:text-blue-400/90">Course</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {courseName}
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            Master the concepts and skills you need to succeed on your AP exam.
          </p>
        </header>

        <div className="space-y-4 rounded-3xl bg-slate-100 px-5 py-6 dark:bg-white/[0.06] sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, desc, iconBg }) => (
              <div key={title} className="text-center sm:text-left">
                <div
                  className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full sm:mx-0 ${iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200/80 pt-6 text-center dark:border-white/[0.08]">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Ready to start?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Add {courseName} to your dashboard and start practicing with real AP-style questions.
            </p>
            <Button
              variant="ghost"
              disabled={isAdding}
              onClick={handleAddCourse}
              className="mt-6 h-12 rounded-full bg-blue-600 px-8 text-base font-semibold text-white hover:bg-blue-700 hover:text-white disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="mr-2 h-5 w-5" />
              {isAdding ? "Adding…" : "Add to dashboard"}
            </Button>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Users className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Join thousands of students preparing for success</span>
            </div>
          </div>
        </div>
      </main>

      <SimpleFooter />
    </div>
  );
}
