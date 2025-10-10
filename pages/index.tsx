import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../client/src/contexts/auth-context";
import Hero from "../client/src/components/sections/hero";
import Features from "../client/src/components/sections/features";
import Benefits from "../client/src/components/sections/benefits";
import Testimonials from "../client/src/components/sections/testimonials";
import Waitlist from "../client/src/components/sections/waitlist";
import Footer from "../client/src/components/sections/footer";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-khan-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green mx-auto mb-4"></div>
          <p className="text-khan-gray-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show landing page if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Hero />
        <Features />
        <Benefits />
        <Testimonials />
        <Waitlist />
        <Footer />
      </div>
    );
  }

  // If authenticated, the useEffect will handle redirect
  return null;
}