
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2, Star, Users, Zap } from "lucide-react";
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
    <section ref={heroRef} className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 bg-background">
      {/* Interactive wavy lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {lines.map((line, index) => {
            const lineY = (line.yOffset / 100) * (heroRef.current?.clientHeight || 1);
            const distanceY = Math.abs(mousePos.y - lineY);
            const maxDistanceY = 150; 
            const proximityY = Math.max(0, 1 - distanceY / maxDistanceY);
            const mouseXPercent = (mousePos.x / (heroRef.current?.clientWidth || 1)) * 100;
            
            return (
              <linearGradient key={index} id={`line-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(155, 54%, 46%)" stopOpacity="0.08" />
                <stop 
                  offset={`${Math.max(0, mouseXPercent - 15)}%`} 
                  stopColor="hsl(155, 54%, 46%)" 
                  stopOpacity="0.08" 
                />
                <stop 
                  offset={`${mouseXPercent}%`} 
                  stopColor={`hsl(155, 54%, ${46 + proximityY * 20}%)`} 
                  stopOpacity={0.08 + proximityY * 0.5}
                />
                <stop 
                  offset={`${Math.min(100, mouseXPercent + 15)}%`} 
                  stopColor="hsl(155, 54%, 46%)" 
                  stopOpacity="0.08" 
                />
                <stop offset="100%" stopColor="hsl(155, 54%, 46%)" stopOpacity="0.08" />
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
              style={{ transition: 'stroke-width 0.2s ease' }}
            />
          );
        })}
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-khan-green/10 text-khan-green text-sm font-bold mb-6">
              <Zap className="w-4 h-4 fill-current" />
              <span>Newly Updated for 2026 Exams</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-foreground mb-6 tracking-tight leading-[1.1]">
              Master Your AP Exams with
              <span className="text-khan-green block mt-2">AI Intelligence</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl lg:mx-0 mx-auto mb-10 leading-relaxed font-medium">
              Join 50,000+ students using personalized study plans, adaptive practice, and instant AI feedback to achieve their target 5.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#36b37e] hover:bg-[#2fa371] text-white shadow-xl shadow-[#36b37e]/20 px-8 py-6 text-lg font-bold group rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  Start Studying Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <button className="flex items-center gap-2 text-foreground font-bold hover:text-khan-green transition-colors px-6 py-3">
                <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center shadow-sm">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                See How It Works
              </button>
            </div>

            <div className="mt-12 flex flex-wrap justify-center lg:justify-start items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-yellow-500 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  <span className="ml-1 font-bold text-foreground">4.9/5</span>
                </div>
                <p className="text-muted-foreground font-medium">Trusted by students from 2,000+ schools</p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative w-full max-w-2xl">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white/50 bg-white">
              <div className="aspect-video bg-gray-50 flex items-center justify-center relative group">
                 {/* Mock UI Demo */}
                 <div className="absolute inset-0 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div className="h-4 w-32 bg-gray-200 rounded-full" />
                      <div className="h-8 w-8 bg-khan-green/20 rounded-lg" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-12 w-full bg-white rounded-xl shadow-sm border border-border p-3 flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-khan-blue/20" />
                        <div className="h-3 w-48 bg-gray-100 rounded-full" />
                      </div>
                      <div className="h-32 w-full bg-white rounded-xl shadow-sm border border-khan-green/30 p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                           <Zap className="w-4 h-4 text-khan-green" />
                           <span className="text-xs font-bold text-khan-green uppercase tracking-wider">AI tutor insight</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-gray-100 rounded-full" />
                          <div className="h-2 w-5/6 bg-gray-100 rounded-full" />
                          <div className="h-2 w-4/6 bg-gray-100 rounded-full" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 bg-white rounded-xl shadow-sm border border-border p-4 flex flex-col justify-between">
                           <div className="h-2 w-12 bg-gray-100 rounded-full" />
                           <div className="h-6 w-16 bg-khan-green/10 rounded text-khan-green text-xs font-bold flex items-center justify-center">+12%</div>
                        </div>
                        <div className="h-24 bg-white rounded-xl shadow-sm border border-border p-4 flex flex-col justify-between">
                           <div className="h-2 w-12 bg-gray-100 rounded-full" />
                           <div className="h-6 w-16 bg-khan-blue/10 rounded text-khan-blue text-xs font-bold flex items-center justify-center">92%</div>
                        </div>
                      </div>
                    </div>
                 </div>
                 
                 <div className="absolute inset-0 bg-black/5 flex items-center justify-center group-hover:bg-black/0 transition-colors cursor-pointer">
                    <div className="w-20 h-20 bg-khan-green rounded-full flex items-center justify-center shadow-2xl text-white transform group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-border animate-bounce-slow hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-khan-green/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-khan-green" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Target Score</p>
                  <p className="text-xl font-black text-foreground">5.0</p>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-border animate-float hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-khan-blue/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-khan-blue" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Today</p>
                  <p className="text-xl font-black text-foreground">12.4k</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroStats() {
  const stats = [
    {
      value: "94%",
      label: "Score Improvement",
      desc: "Students see an average jump of 1.2 points on practice tests.",
      icon: TrendingUpIcon,
      color: "text-khan-green",
      bg: "bg-khan-green/10"
    },
    {
      value: "50k+",
      label: "Active Students",
      desc: "Preparing for 38 different AP subjects across the globe.",
      icon: Users,
      color: "text-khan-blue",
      bg: "bg-khan-blue/10"
    },
    {
      value: "20min",
      label: "Daily Efficiency",
      desc: "Our AI optimizes your time so you study smarter, not longer.",
      icon: Zap,
      color: "text-khan-orange",
      bg: "bg-khan-orange/10"
    },
    {
      value: "4.9/5",
      label: "App Rating",
      desc: "Ranked #1 for AP Prep tools by students and educators.",
      icon: Star,
      color: "text-khan-purple",
      bg: "bg-khan-purple/10"
    }
  ];

  return (
    <section className="relative bg-white py-16 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center lg:text-left">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground tracking-tight">{stat.value}</div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendingUpIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
