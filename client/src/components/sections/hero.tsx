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
import { useEffect, useState } from "react";
import { HeroPlatformStatsStrip } from "@/components/sections/hero-platform-stats";

const ROTATING_SUBJECTS = [
  "AP Physics",
  "AP Calculus",
  "AP Chemistry",
  "AP U.S. History",
  "AP Biology",
  "AP Macro",
];

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATING_SUBJECTS.length);
        setWordVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="landing-hero-surface landing-story-snap relative overflow-hidden min-h-[90vh]">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="orb w-[600px] h-[600px] -top-32 -right-16 bg-blue-400/12 dark:bg-blue-500/8 animate-blob"
          style={{ animationDuration: "9s" }}
        />
        <div
          className="orb w-[400px] h-[400px] top-1/2 -left-32 bg-indigo-400/8 dark:bg-indigo-500/6 animate-blob"
          style={{ animationDuration: "11s", animationDelay: "2s" }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.018] dark:opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 md:pb-24 md:pt-10 lg:px-8">
        <HeroPlatformStatsStrip />

        <div className="mt-6 grid grid-cols-1 items-center gap-12 lg:mt-10 lg:grid-cols-2 lg:gap-20">
          {/* LEFT: Content */}
          <div
            className={`transition-all duration-500 ease-out ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            }`}
          >
            {/* Badge */}
            <div className="landing-eyebrow landing-eyebrow--accent mb-7 pr-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-[12px] font-semibold tracking-normal normal-case text-blue-800 dark:text-blue-200">
                AI-Powered AP Exam Prep
              </span>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none flex-shrink-0 uppercase tracking-wide">
                Free
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[2.75rem] sm:text-5xl md:text-[3.5rem] lg:text-[3.75rem] font-bold tracking-tight leading-[1.08] mb-7">
              <span className="text-slate-900 dark:text-white block">Master Your</span>
              <span
                className={`block text-gradient transition-all duration-250 ${
                  wordVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
                }`}
                style={{ minHeight: "1.15em" }}
              >
                {ROTATING_SUBJECTS[wordIndex]}
              </span>
              <span className="text-slate-900 dark:text-white block text-[2.25rem] sm:text-[2.75rem] md:text-[3rem]">
                AP Exam
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[480px] mb-9 leading-relaxed">
              Personalized study plans, adaptive practice tests, and instant AI
              feedback — built to get you a{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                perfect 5
              </span>
              .
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-9">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 h-12 text-[15px] font-semibold group rounded-lg transition-all duration-200 shadow-[0_2px_12px_rgba(37,99,235,0.28)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.38)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start Learning Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/learn">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 px-8 py-3 h-12 text-[15px] font-semibold rounded-lg transition-all duration-200"
                >
                  Browse Courses
                </Button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-5">
              {[
                { icon: CheckCircle, label: "100% Free" },
                { icon: Brain, label: "AI-Powered" },
                { icon: BookOpen, label: "All AP Subjects" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500"
                >
                  <Icon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-[13px] font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Product preview card */}
          <div
            className={`hidden lg:flex justify-center items-center transition-all duration-500 ease-out delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-6 scale-95"
            }`}
          >
            <div className="relative">
              {/* Main card */}
              <div className="w-[340px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
                {/* Top accent bar */}
                <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 to-blue-600" />

                {/* Header */}
                <div className="px-5 pt-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                    AP Macro
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      May 2025
                    </span>
                    <span className="text-slate-200 dark:text-slate-700">·</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      9 Units
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2.5 p-4">
                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-800/50">
                    <p className="text-[9.5px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" /> Predicted Score
                    </p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      5<span className="text-sm font-semibold opacity-50">/5</span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[9.5px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5" /> Unit Mastery
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      6<span className="text-sm font-semibold text-slate-400">/9</span>
                    </p>
                    <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "67%" }} />
                    </div>
                  </div>
                </div>

                {/* Unit progress */}
                <div className="px-4 pb-3.5">
                  <p className="text-[9.5px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">
                    Unit Progress
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          i <= 5
                            ? "bg-blue-600"
                            : i <= 6
                            ? "bg-blue-400"
                            : i <= 8
                            ? "bg-blue-200 dark:bg-blue-900"
                            : "bg-slate-100 dark:bg-slate-800"
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
                  <div className="w-full bg-blue-600 text-white text-[13px] font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(37,99,235,0.25)]">
                    <Target className="w-3.5 h-3.5" />
                    Continue Practice
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Floating: predicted score */}
              <div className="absolute -top-5 -right-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg px-3.5 py-2.5 flex items-center gap-2.5 animate-float">
                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">
                    Score: 5/5
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Predicted AP Score
                  </p>
                </div>
              </div>

              {/* Floating: session complete */}
              <div className="absolute -bottom-4 -left-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg px-3.5 py-2.5 flex items-center gap-2.5 animate-float-slow">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">
                    +15 Questions
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Practice complete!
                  </p>
                </div>
              </div>

              {/* Floating: AI indicator */}
              <div
                className="absolute top-1/2 -left-10 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg px-3 py-2 flex items-center gap-2 animate-float"
                style={{ animationDelay: "1.2s" }}
              >
                <div className="w-7 h-7 bg-violet-50 dark:bg-violet-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  AI Explanation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-slate-50 dark:from-[#090D14] to-transparent pointer-events-none" />
    </section>
  );
}
