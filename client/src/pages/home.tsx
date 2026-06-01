import Navigation from "@/components/ui/navigation";
import { Hero } from "@/components/sections/hero";
import { LandingHowItWorks } from "@/components/sections/landing-how-it-works";
import { LandingCoursesGallery } from "@/components/sections/landing-courses-gallery";
import { LandingStudyPreview } from "@/components/sections/landing-study-preview";
import { LandingUnitQuizzes } from "@/components/sections/landing-unit-quizzes";
import { LandingExplanations } from "@/components/sections/landing-explanations";
import { LandingApLevelEvaluations, LandingFullLengthTests } from "@/components/sections/landing-exam-demo";
import { Features } from "@/components/sections/features";
import { FAQ } from "@/components/sections/faq";
import SimpleFooter from "@/components/sections/simple-footer";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import type { PlatformPublicStats } from "@/components/sections/hero-platform-stats";

export default function Home({
  initialPlatformStats = null,
}: {
  initialPlatformStats?: PlatformPublicStats | null;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="landing-page flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900/80" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-spin" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="landing-page min-h-screen bg-white text-slate-900 dark:bg-[#0B0F1A] dark:text-slate-100">
      <Navigation />
      <Hero initialPlatformStats={initialPlatformStats} />
      <LandingHowItWorks />
      <LandingCoursesGallery />
      <LandingStudyPreview />
      <LandingUnitQuizzes />
      <LandingExplanations />
      <LandingFullLengthTests />
      <LandingApLevelEvaluations />
      <Features />
      <FAQ />
      <SimpleFooter />
    </div>
  );
}
