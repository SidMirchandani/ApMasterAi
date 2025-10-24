
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-khan-background via-white to-white py-16 md:py-24 lg:py-40">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-khan-green/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-khan-blue/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-khan-green/10 border border-khan-green/20 rounded-full">
            <span className="w-2 h-2 bg-khan-green rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-khan-green">Beta Launch January 2026</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-khan-gray-dark mb-6 leading-tight">
            Master AP Exams with
            <span className="text-gradient-green block mt-2">AI-Powered Learning</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-khan-gray-medium max-w-3xl mx-auto mb-10 leading-relaxed px-4">
            Personalized study plans, adaptive practice tests, and instant feedback to help you ace your AP exams.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
            <Link href="/signup">
              <Button 
                size="lg" 
                className="w-full sm:w-auto btn-primary shadow-lg shadow-khan-green/20 px-8 py-6 text-lg group"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/learn">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto btn-secondary px-8 py-6 text-lg"
              >
                Browse Courses
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-khan-gray-medium">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-khan-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-khan-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">AI-powered</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-khan-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Personalized</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
