import Navigation from "@/components/ui/navigation";
import { Hero, HeroStats } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-khan-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-khan-gray-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <HeroStats />
      <Features />
    </div>
  );
}