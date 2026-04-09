import {
  BookOpen,
  Brain,
  Target,
  TrendingUp,
  Sparkles,
  Clock,
  UserPlus,
  Play,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// How it works steps
const steps = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    desc: "Sign up free and select the AP courses you're studying this year.",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    numBg: "bg-blue-600",
    stepLine: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    icon: Play,
    title: "Practice with AI Questions",
    desc: "Tackle adaptive MCQ questions that focus on your weak spots.",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    numBg: "bg-indigo-600",
    stepLine: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  {
    icon: MessageSquare,
    title: "Get Instant Explanations",
    desc: "AI breaks down every question — right or wrong — so you actually learn.",
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    numBg: "bg-violet-600",
    stepLine: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    desc: "Monitor unit mastery, accuracy, and your predicted AP score over time.",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    numBg: "bg-emerald-600",
    stepLine: "bg-emerald-100 dark:bg-emerald-900/30",
  },
];

// Feature cards
const features = [
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description:
      "Our AI analyzes your performance patterns and adapts in real-time to target exactly what you need to improve — so every minute of studying counts.",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    accentColor: "bg-blue-600",
    size: "large",
    tag: "Core Feature",
    tagStyle: "bg-blue-600 text-white",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    description:
      "Questions intelligently adjust to your skill level, spending more time on units where you're struggling and less on what you've already mastered.",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentColor: "bg-emerald-500",
    size: "large",
    tag: "Smart Learning",
    tagStyle: "bg-emerald-600 text-white",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Detailed analytics and unit mastery charts keep you on track.",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accentColor: "bg-indigo-500",
    size: "small",
    tag: null,
    tagStyle: "",
  },
  {
    icon: BookOpen,
    title: "Comprehensive Content",
    description: "All AP subjects with every unit covered in depth.",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    accentColor: "bg-amber-500",
    size: "small",
    tag: null,
    tagStyle: "",
  },
  {
    icon: Sparkles,
    title: "Instant Explanations",
    description: "AI-generated explanations for every question, instantly.",
    iconBg: "bg-rose-50 dark:bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    accentColor: "bg-rose-500",
    size: "small",
    tag: null,
    tagStyle: "",
  },
  {
    icon: Clock,
    title: "Full-Length Tests",
    description: "Simulate real AP exam conditions with timed full-length tests.",
    iconBg: "bg-cyan-50 dark:bg-cyan-500/10",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    accentColor: "bg-cyan-500",
    size: "small",
    tag: null,
    tagStyle: "",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.05 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStepsVisible(true);
      },
      { threshold: 0.08 }
    );
    if (stepsRef.current) observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-band-light relative py-20 md:py-28 overflow-hidden"
    >
      <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-50 dark:from-[#090D14] to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ===== HOW IT WORKS ===== */}
        <div ref={stepsRef} className="mb-24">
          <div
            className={`text-center mb-12 transition-all duration-500 ${
              stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            }`}
          >
            <div className="landing-eyebrow mb-5">
              <span className="text-[11px]">How It Works</span>
            </div>
            <h2 className="landing-section-title mb-3">
              Study Smarter in{" "}
              <span className="text-gradient">4 Simple Steps</span>
            </h2>
            <p className="landing-section-desc max-w-md">
              Get started in minutes and see results in days.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-[2.25rem] left-[15%] right-[15%] h-px border-t border-dashed border-slate-200 dark:border-slate-800" />

            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex flex-col items-center text-center transition-all duration-500 ${
                  stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Icon */}
                <div className="relative mb-5 z-10">
                  <div
                    className={`w-[4.5rem] h-[4.5rem] rounded-xl ${step.iconBg} border border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm`}
                  >
                    <step.icon className={`w-7 h-7 ${step.iconColor}`} />
                  </div>
                  <div
                    className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full ${step.numBg} text-white text-[10px] font-black flex items-center justify-center shadow-sm`}
                  >
                    {i + 1}
                  </div>
                </div>

                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1.5 leading-tight">
                  {step.title}
                </h3>
                <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FEATURES GRID ===== */}
        <div
          className={`text-center mb-12 transition-all duration-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <div className="landing-eyebrow landing-eyebrow--accent mb-5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px]">Features</span>
          </div>
          <h2 className="landing-section-title text-3xl sm:text-4xl lg:text-[2.75rem] mb-4">
            Everything You Need
            <br />
            <span className="text-gradient">to Score a 5</span>
          </h2>
          <p className="landing-section-desc max-w-xl text-[16px]">
            AI technology meets proven learning methods to accelerate your AP prep.
          </p>
        </div>

        {/* Feature bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map((feature, index) => {
            const isLarge = feature.size === "large";
            return (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/60 transition-all duration-300 hover:-translate-y-1 cursor-default ${
                  isLarge ? "lg:col-span-2" : ""
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${120 + index * 60}ms` }}
              >
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-4 bottom-4 w-[3px] ${feature.accentColor} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                {/* Tag */}
                {feature.tag && (
                  <div className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${feature.tagStyle}`}>
                    {feature.tag}
                  </div>
                )}

                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`w-11 h-11 ${feature.iconBg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}
                  >
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>

                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-2.5 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[13.5px]">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div
          className={`mt-14 transition-all duration-500 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 dark:bg-[#0C121C] px-8 py-10 text-center shadow-xl shadow-slate-900/20">
            {/* Background orbs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-white/85 uppercase tracking-wider">100% Free</span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                Ready to ace your AP exams?
              </h3>
              <p className="text-slate-400 mb-7 text-[15px] max-w-md mx-auto leading-relaxed">
                Join thousands of students already using APMaster.ai to prepare smarter.
              </p>
              <Link href="/signup">
                <Button
                  size="lg"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 h-12 rounded-lg shadow-[0_2px_12px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 text-[15px]"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
