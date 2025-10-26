
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

  // Generate wavy lines with different orientations
  const generateWavyPath = (
    startX: number, 
    startY: number, 
    angle: number, 
    length: number, 
    amplitude: number, 
    frequency: number
  ) => {
    const points: string[] = [];
    const steps = 50;
    
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * length;
      const wave = Math.sin((i / steps) * Math.PI * frequency) * amplitude;
      
      // Calculate position along the angled line with wave offset perpendicular to it
      const x = startX + t * Math.cos(angle) + wave * Math.sin(angle);
      const y = startY + t * Math.sin(angle) - wave * Math.cos(angle);
      
      points.push(`${x},${y}`);
    }
    
    return `M ${points.join(' L ')}`;
  };

  const lines = [
    { startX: 10, startY: 20, angle: 0.1, length: 80, amplitude: 1.5, frequency: 3 },
    { startX: 5, startY: 35, angle: -0.05, length: 90, amplitude: 2, frequency: 2.5 },
    { startX: 15, startY: 50, angle: 0.15, length: 70, amplitude: 1.8, frequency: 3.5 },
    { startX: 8, startY: 65, angle: -0.1, length: 85, amplitude: 2.2, frequency: 2.8 },
    { startX: 20, startY: 80, angle: 0.08, length: 75, amplitude: 1.6, frequency: 3.2 },
    { startX: 12, startY: 10, angle: -0.12, length: 60, amplitude: 1.9, frequency: 2.7 },
    { startX: 25, startY: 40, angle: 0.2, length: 65, amplitude: 1.7, frequency: 3.1 },
  ];

  return (
    <section ref={heroRef} className="relative overflow-hidden py-16 md:py-24 lg:py-40 bg-white">
      {/* Interactive wavy lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {lines.map((line, index) => {
          const path = generateWavyPath(
            line.startX, 
            line.startY, 
            line.angle, 
            line.length, 
            line.amplitude, 
            line.frequency
          );
          
          // Calculate distance from mouse to line's center point
          const heroHeight = heroRef.current?.clientHeight || 1;
          const heroWidth = heroRef.current?.clientWidth || 1;
          const lineCenterX = ((line.startX + line.length * Math.cos(line.angle) / 2) / 100) * heroWidth;
          const lineCenterY = ((line.startY + line.length * Math.sin(line.angle) / 2) / 100) * heroHeight;
          
          const distance = Math.sqrt(
            Math.pow(mousePos.x - lineCenterX, 2) + 
            Math.pow(mousePos.y - lineCenterY, 2)
          );
          
          const maxDistance = 150;
          const proximity = Math.max(0, 1 - distance / maxDistance);
          
          // Color transitions from very light green to vibrant green
          const opacity = 0.08 + proximity * 0.5;
          const saturation = 20 + proximity * 80;
          
          return (
            <path
              key={index}
              d={path}
              stroke={`hsl(116, ${saturation}%, 40%)`}
              strokeWidth="0.3"
              fill="none"
              opacity={opacity}
              style={{
                transition: 'stroke 0.3s ease, opacity 0.3s ease',
              }}
            />
          );
        })}
      </svg>

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
        </div>
      </div>
    </section>
  );
}

export function HeroStats() {
  return (
    <section className="relative bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
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
    </section>
  );
}
