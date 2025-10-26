
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export function Hero() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const waveContainer = document.querySelector('.wave-container') as HTMLElement;
      if (waveContainer) {
        // Parallax effect - waves move at 30% of scroll speed
        waveContainer.style.transform = `translateY(${scrollY * 0.3}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24 lg:py-40">
      {/* Animated wave gradient background */}
      <div className="wave-container">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="shadow-right">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="2" dy="0" result="offsetblur"/>
              <feFlood floodColor="hsl(116, 100%, 20%)" floodOpacity="0.15"/>
              <feComposite in2="offsetblur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Wave 1 */}
          <path className="wave-path-1" stroke="hsl(116, 100%, 33%)" strokeWidth="1.5" fill="none" opacity="0.06" filter="url(#glow) url(#shadow-right)"
            d="M-500,100 Q-250,50 0,100 T500,100 T1000,100 T1500,100 T2000,100 T2500,100" />
          
          {/* Wave 2 */}
          <path className="wave-path-2" stroke="hsl(122, 75%, 41%)" strokeWidth="1.5" fill="none" opacity="0.08" filter="url(#glow) url(#shadow-right)"
            d="M-500,200 Q-200,150 100,200 T600,200 T1200,200 T1800,200 T2400,200 T3000,200" />
          
          {/* Wave 3 */}
          <path className="wave-path-3" stroke="hsl(116, 100%, 33%)" strokeWidth="1.5" fill="none" opacity="0.05" filter="url(#glow) url(#shadow-right)"
            d="M-500,350 Q-300,300 -100,350 T400,350 T800,350 T1200,350 T1600,350 T2000,350" />
          
          {/* Wave 4 */}
          <path className="wave-path-4" stroke="hsl(122, 75%, 41%)" strokeWidth="1.5" fill="none" opacity="0.07" filter="url(#glow) url(#shadow-right)"
            d="M-500,500 Q-150,450 200,500 T700,500 T1400,500 T2100,500 T2800,500 T3500,500" />
          
          {/* Wave 5 */}
          <path className="wave-path-5" stroke="hsl(116, 100%, 33%)" strokeWidth="1.5" fill="none" opacity="0.06" filter="url(#glow) url(#shadow-right)"
            d="M-500,650 Q-250,600 0,650 T500,650 T1000,650 T1500,650 T2000,650 T2500,650" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center animate-fade-in">
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
                <div className="w-12 h-12 bg-khan-blue/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-khan-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">34.9%</div>
                <p className="text-sm text-khan-gray-medium mb-2">of U.S. public high school graduates took at least one AP exam</p>
                <p className="text-xs text-khan-gray-light italic">College Board, Class of 2021</p>
              </div>

              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-khan-green/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-khan-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">22.5%</div>
                <p className="text-sm text-khan-gray-medium mb-2">scored a 3 or higher on their AP exam</p>
                <p className="text-xs text-khan-gray-light italic">College Board Reports</p>
              </div>

              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-khan-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-khan-purple" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-khan-gray-dark mb-2">83%</div>
                <p className="text-sm text-khan-gray-medium mb-2">of teens cite school as a significant source of stress</p>
                <p className="text-xs text-khan-gray-light italic">American Psychological Association</p>
              </div>

              <div className="bg-white border border-khan-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
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