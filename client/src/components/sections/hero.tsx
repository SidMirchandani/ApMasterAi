
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

          {/* Statistics Section */}
          <div className="mt-24 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-khan-blue/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-khan-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">34.9%</div>
                <p className="text-sm text-khan-gray-medium mb-2">of U.S. public high school graduates took at least one AP exam</p>
                <p className="text-xs text-khan-gray-light italic">College Board, Class of 2021</p>
              </div>

              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-khan-green/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-khan-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">22.5%</div>
                <p className="text-sm text-khan-gray-medium mb-2">scored a 3 or higher on their AP exam</p>
                <p className="text-xs text-khan-gray-light italic">College Board Reports</p>
              </div>

              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-khan-purple/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-khan-purple" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">83%</div>
                <p className="text-sm text-khan-gray-medium mb-2">of teens cite school as a significant source of stress</p>
                <p className="text-xs text-khan-gray-light italic">American Psychological Association</p>
              </div>

              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">71%</div>
                <p className="text-sm text-khan-gray-medium mb-2">of students say AI-powered tools improved their learning</p>
                <p className="text-xs text-khan-gray-light italic">McKinsey & Company</p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-lg text-khan-gray-medium max-w-3xl mx-auto leading-relaxed">
                With <span className="font-semibold text-khan-green">61% of teens</span> reporting that getting good grades is a significant source of stress, APMaster combines AI technology with proven educational methods to make AP preparation more effective and less overwhelming.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
