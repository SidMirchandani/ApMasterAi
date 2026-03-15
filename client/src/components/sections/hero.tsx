import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  Star,
  CheckCircle,
  BookOpen,
  Zap,
  TrendingUp,
  Calendar,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ROTATING_SUBJECTS = [
  "AP Physics",
  "AP Calculus",
  "AP Chemistry",
  "AP U.S. History",
  "AP Biology",
  "AP Macroeconomics",
];

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATING_SUBJECTS.length);
        setWordVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden min-h-[92vh] flex items-center mesh-gradient-intense">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="orb w-[700px] h-[700px] -top-40 -right-20 bg-blue-400/20 dark:bg-blue-500/10 animate-blob"
          style={{ animationDuration: "7s" }}
        />
        <div
          className="orb w-[500px] h-[500px] top-1/2 -left-40 bg-violet-400/15 dark:bg-violet-500/10 animate-blob"
          style={{ animationDuration: "9s", animationDelay: "2s" }}
        />
        <div
          className="orb w-[400px] h-[400px] bottom-10 right-1/3 bg-cyan-400/10 dark:bg-cyan-500/8 animate-blob"
          style={{ animationDuration: "11s", animationDelay: "4s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="absolute inset-0 noise pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20 md:py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* LEFT: Content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                AI-Powered AP Exam Prep
              </span>
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none flex-shrink-0">
                Free
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.05] mb-8">
              <span className="text-slate-900 dark:text-white block">Master Your</span>
              <span
                className={`block text-gradient transition-all duration-300 ${
                  wordVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
                style={{ minHeight: "1.1em" }}
              >
                {ROTATING_SUBJECTS[wordIndex]}
              </span>
              <span className="text-slate-900 dark:text-white block text-4xl sm:text-5xl md:text-6xl font-black">
                AP Exam
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-lg mb-10 leading-relaxed font-medium">
              Personalized study plans, adaptive practice tests, and instant AI
              feedback — built to get you a{" "}
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                perfect 5
              </span>
              .
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-9 py-6 text-base font-bold group rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.45)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start Learning Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/learn">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 px-9 py-6 text-base font-bold rounded-2xl transition-all duration-300"
                >
                  Browse Courses
                </Button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6">
              {[
                { icon: CheckCircle, label: "100% Free" },
                { icon: Brain, label: "AI-Powered" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400"
                >
                  <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Floating product preview */}
          <div
            className={`hidden lg:flex justify-center items-center transition-all duration-700 delay-300 ${
              isVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-8 scale-95"
            }`}
          >
            <div className="relative">
              {/* Main card — matches dashboard subject card */}
              <div className="w-[340px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_24px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden">
                {/* Colored top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-600" />
                {/* Header: subject name + meta */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-base font-display font-bold text-slate-900 dark:text-white leading-tight">
                    AP Macroeconomics
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      May 2025
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      9 Units
                    </span>
                  </div>
                </div>
                {/* Two stat boxes */}
                <div className="grid grid-cols-2 gap-2 p-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-800/60">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" /> Predicted Score
                    </p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">5<span className="text-sm font-bold opacity-60">/5</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5" /> Unit Mastery
                    </p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">6<span className="text-sm font-bold text-slate-400">/9</span></p>
                    <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: "67%" }} />
                    </div>
                  </div>
                </div>
                {/* Unit progress squares */}
                <div className="px-4 pb-3">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Unit Progress</p>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-md flex items-center justify-center ${
                          i <= 6 ? "bg-blue-500" : i <= 8 ? "bg-blue-400" : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      >
                        {i <= 5 && (
                          <svg viewBox="0 0 24 24" fill="none" className="w-2 h-2">
                            <path d="M2 8L5 4L8 7L12 2L16 7L19 4L22 8L19 19H5L2 8Z" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* CTA */}
                <div className="px-4 pb-4">
                  <div className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(59,130,246,0.25)]">
                    <Target className="w-3.5 h-3.5" />
                    Continue Practice
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Floating: predicted score */}
              <div className="absolute -top-5 -right-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl px-4 py-3 flex items-center gap-2.5 animate-float">
                <div className="w-9 h-9 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white leading-none">
                    Score: 5/5
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Predicted AP Score
                  </p>
                </div>
              </div>

              {/* Floating: session complete */}
              <div className="absolute -bottom-4 -left-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl px-4 py-3 flex items-center gap-2.5 animate-float-slow">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white leading-none">
                    +15 Questions
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Practice complete!
                  </p>
                </div>
              </div>

              {/* Floating: AI indicator */}
              <div
                className="absolute top-1/2 -left-10 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl px-3 py-2.5 flex items-center gap-2 animate-float"
                style={{ animationDelay: "1.2s" }}
              >
                <div className="w-7 h-7 bg-violet-100 dark:bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  AI Explanation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none" />
    </section>
  );
}

// ============================
// HERO STATS SECTION
// ============================
const stats = [
  {
    value: "34.9%",
    label: "of U.S. public high school graduates took at least one AP exam",
    source: "College Board, Class of 2021",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    borderColor: "border-blue-200/60 dark:border-blue-800/60",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "22.5%",
    label: "of students scored a 3 or higher on their AP exams",
    source: "College Board Reports",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    borderColor: "border-emerald-200/60 dark:border-emerald-800/60",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "83%",
    label: "of teens cite school as a significant source of stress",
    source: "APA Research",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    borderColor: "border-violet-200/60 dark:border-violet-800/60",
    textColor: "text-violet-600 dark:text-violet-400",
  },
  {
    value: "71%",
    label: "of students say AI tools improved their learning outcomes",
    source: "McKinsey Insights",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    borderColor: "border-amber-200/60 dark:border-amber-800/60",
    textColor: "text-amber-600 dark:text-amber-400",
  },
];

export function HeroStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/20 dark:to-slate-950 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              The AP Landscape
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Why Students Need{" "}
            <span className="text-gradient">Better Prep</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
            The data tells a clear story — and APMaster.ai was built to change it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-2xl p-7 bg-white dark:bg-slate-900 border ${stat.borderColor} hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1.5 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Top gradient accent line */}
              <div
                className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              {/* Icon */}
              <div className={`w-11 h-11 ${stat.bgColor} rounded-xl flex items-center justify-center mb-5 border ${stat.borderColor}`}>
                <span className={`text-base font-black ${stat.textColor}`}>#</span>
              </div>

              {/* Value */}
              <div className={`text-4xl font-display font-black mb-3 tracking-tight bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </div>

              {/* Label */}
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                {stat.label}
              </p>

              {/* Source */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                  {stat.source}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom callout */}
        <div
          className={`mt-16 mx-auto max-w-3xl transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 to-blue-600 p-px shadow-[0_8px_32px_rgba(59,130,246,0.2)]">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1px)] px-8 py-6 text-center">
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                With{" "}
                <span className="font-black text-blue-600 dark:text-blue-400">
                  61% of teens
                </span>{" "}
                reporting grades as a significant stressor, APMaster.ai combines
                AI with proven study methods to make prep more effective — and
                less overwhelming.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
