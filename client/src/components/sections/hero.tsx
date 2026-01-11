
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const heroElement = heroRef.current;
    if (heroElement) {
      heroElement.addEventListener('mousemove', handleMouseMove);
      return () => heroElement.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  // Generate wavy lines
  const generateWavyPath = (yOffset: number, amplitude: number, frequency: number) => {
    const points: string[] = [];
    const width = 100;
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const y = yOffset + Math.sin((i / steps) * Math.PI * frequency) * amplitude;
      points.push(`${x},${y}`);
    }
    
    return `M ${points.join(' L ')}`;
  };

  const lines = [
    { yOffset: 15, amplitude: 2, frequency: 3 },
    { yOffset: 30, amplitude: 2.5, frequency: 2.5 },
    { yOffset: 45, amplitude: 2, frequency: 3.5 },
    { yOffset: 60, amplitude: 2.2, frequency: 2.8 },
    { yOffset: 75, amplitude: 2.3, frequency: 3.2 },
  ];

  return (
    <section ref={heroRef} className="relative overflow-hidden pt-12 pb-24 md:pt-16 md:pb-32 lg:pt-24 lg:pb-48 bg-background">
      {/* Interactive wavy lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {lines.map((line, index) => {
            const lineY = (line.yOffset / 100) * (heroRef.current?.clientHeight || 1);
            const distanceY = Math.abs(mousePos.y - lineY);
            const maxDistanceY = 150; // Smaller vertical range
            const proximityY = Math.max(0, 1 - distanceY / maxDistanceY);
            
            // Calculate horizontal position as percentage
            const mouseXPercent = (mousePos.x / (heroRef.current?.clientWidth || 1)) * 100;
            
            return (
              <linearGradient key={index} id={`line-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                {/* Create stops for localized glow effect */}
                <stop offset="0%" stopColor="hsl(155, 54%, 46%)" stopOpacity="0.15" />
                <stop 
                  offset={`${Math.max(0, mouseXPercent - 15)}%`} 
                  stopColor="hsl(155, 54%, 46%)" 
                  stopOpacity="0.15" 
                />
                <stop 
                  offset={`${mouseXPercent}%`} 
                  stopColor={`hsl(155, 54%, ${46 + proximityY * 20}%)`} 
                  stopOpacity={0.15 + proximityY * 0.6}
                />
                <stop 
                  offset={`${Math.min(100, mouseXPercent + 15)}%`} 
                  stopColor="hsl(155, 54%, 46%)" 
                  stopOpacity="0.15" 
                />
                <stop offset="100%" stopColor="hsl(155, 54%, 46%)" stopOpacity="0.15" />
              </linearGradient>
            );
          })}
        </defs>
        {lines.map((line, index) => {
          const path = generateWavyPath(line.yOffset, line.amplitude, line.frequency);
          
          return (
            <path
              key={index}
              d={path}
              stroke={`url(#line-gradient-${index})`}
              strokeWidth="0.3"
              fill="none"
              style={{
                transition: 'stroke-width 0.2s ease',
              }}
            />
          );
        })}
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center animate-fade-in max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-[#2d3b45] mb-8 tracking-tighter leading-[1.05]">
            Master AP Exams with
            <span className="text-[#36b37e] block mt-1">AI-Powered Learning</span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed px-4 font-medium">
            Personalized study plans, adaptive practice tests, and instant feedback to help you ace your AP exams.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-[#36b37e] hover:bg-[#2fa371] text-white shadow-xl shadow-[#36b37e]/20 px-10 py-7 text-xl font-bold group rounded-2xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/learn">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-border bg-white text-foreground hover:bg-accent px-10 py-7 text-xl font-bold rounded-2xl transition-all"
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

export function HeroStats() {
  return (
    <section className="relative bg-background py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white border-none rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-14 h-14 bg-khan-blue/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-khan-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div className="text-4xl font-black text-foreground mb-3 tracking-tight">34.9%</div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">of U.S. public high school graduates took at least one AP exam</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">College Board, Class of 2021</p>
                </div>
              </div>

              <div className="bg-white border-none rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-14 h-14 bg-khan-green/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-khan-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-4xl font-black text-foreground mb-3 tracking-tight">22.5%</div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">scored a 3 or higher on their AP exam</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">College Board Reports</p>
                </div>
              </div>

              <div className="bg-white border-none rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-14 h-14 bg-khan-purple/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-khan-purple" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-4xl font-black text-foreground mb-3 tracking-tight">83%</div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">of teens cite school as a significant source of stress</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">APA Research</p>
                </div>
              </div>

              <div className="bg-white border-none rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-14 h-14 bg-khan-orange/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-khan-orange" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="text-4xl font-black text-foreground mb-3 tracking-tight">71%</div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">of students say AI tools improved their learning</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">McKinsey Insights</p>
                </div>
              </div>
            </div>

            <div className="mt-20 text-center max-w-3xl mx-auto">
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              With <span className="font-bold text-khan-green">61% of teens</span> reporting that grades are a significant source of stress, APMaster combines AI with proven methods to make prep more effective and less overwhelming.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
