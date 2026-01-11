import Navigation from "@/components/ui/navigation";
import { Hero, HeroStats } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { InteractiveDemos } from "@/components/sections/interactive-demos";
import { FAQ } from "@/components/sections/faq";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-[#2d3b45] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#36b37e] rounded flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">APMaster</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Making elite-level AP preparation accessible to every student, regardless of background.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/signup" className="text-gray-300 hover:text-[#36b37e] transition-colors">Get Started</Link></li>
              <li><Link href="/login" className="text-gray-300 hover:text-[#36b37e] transition-colors">Sign In</Link></li>
              <li><Link href="/learn" className="text-gray-300 hover:text-[#36b37e] transition-colors">Browse Courses</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="text-gray-300 hover:text-[#36b37e] transition-colors">About Us</Link></li>
              <li><Link href="/story" className="text-gray-300 hover:text-[#36b37e] transition-colors">Our Story</Link></li>
              <li><Link href="/get-involved" className="text-gray-300 hover:text-[#36b37e] transition-colors">Get Involved</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Connect</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="mailto:hello@apmaster.ai" className="text-gray-300 hover:text-[#36b37e] transition-colors">hello@apmaster.ai</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} APMaster.ai. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm">
            Built with purpose. Free forever.
          </p>
        </div>
      </div>
    </footer>
  );
}

function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#36b37e] to-[#2fa371]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Master Your AP Exams?
        </h2>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          Join thousands of students using AI-powered learning to achieve their best scores. It's free, personalized, and built for your success.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-white text-[#36b37e] hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-xl">
              Start Learning Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/learn">
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-bold rounded-xl">
              Explore Courses
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

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
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <HeroStats />
      <Features />
      <InteractiveDemos />
      <FAQ />
      <CTASection />
      <Footer />
    </div>
  );
}
