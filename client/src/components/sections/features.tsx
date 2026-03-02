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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// How it works steps
const steps = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    desc: "Sign up free and select the AP courses you're studying this year.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-800",
    num: "bg-emerald-500",
  },
  {
    icon: Play,
    title: "Practice with AI Questions",
    desc: "Tackle adaptive MCQ questions that focus on your weak spots.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-800",
    num: "bg-blue-500",
  },
  {
    icon: MessageSquare,
    title: "Get Instant Explanations",
    desc: "AI breaks down every question — right or wrong — so you actually learn.",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-800",
    num: "bg-violet-500",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    desc: "Monitor unit mastery, accuracy, and your predicted AP score over time.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-800",
    num: "bg-amber-500",
  },
];

// Feature bento cards
const features = [
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description:
      "Our AI analyzes your performance patterns and adapts in real-time to target exactly what you need to improve — so every minute of studying counts.",
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/5",
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    hoverBorder: "group-hover:border-violet-200 dark:group-hover:border-violet-800",
    accentLine: "from-violet-500 to-purple-600",
    size: "large",
    tag: "Core Feature",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    description:
      "Questions intelligently adjust to your skill level, spending more time on units where you're struggling and less on what you've already mastered.",
    gradient: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/5",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "group-hover:border-emerald-200 dark:group-hover:border-emerald-800",
    accentLine: "from-emerald-500 to-teal-600",
    size: "large",
    tag: "Smart Learning",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Detailed analytics and unit mastery charts keep you on track.",
    gradient: "from-blue-500 to-cyan-600",
    bgGlow: "bg-blue-500/5",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    hoverBorder: "group-hover:border-blue-200 dark:group-hover:border-blue-800",
    accentLine: "from-blue-500 to-cyan-600",
    size: "small",
    tag: null,
  },
  {
    icon: BookOpen,
    title: "Comprehensive Content",
    description: "All AP subjects with every unit covered in depth.",
    gradient: "from-amber-500 to-orange-600",
    bgGlow: "bg-amber-500/5",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    hoverBorder: "group-hover:border-amber-200 dark:group-hover:border-amber-800",
    accentLine: "from-amber-500 to-orange-600",
    size: "small",
    tag: null,
  },
  {
    icon: Sparkles,
    title: "Instant Explanations",
    description: "AI-generated explanations for every question, instantly.",
    gradient: "from-rose-500 to-pink-600",
    bgGlow: "bg-rose-500/5",
    iconBg: "bg-rose-50 dark:bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    hoverBorder: "group-hover:border-rose-200 dark:group-hover:border-rose-800",
    accentLine: "from-rose-500 to-pink-600",
    size: "small",
    tag: null,
  },
  {
    icon: Clock,
    title: "Full-Length Tests",
    description: "Simulate real AP exam conditions with timed full-length tests.",
    gradient: "from-cyan-500 to-blue-600",
    bgGlow: "bg-cyan-500/5",
    iconBg: "bg-cyan-50 dark:bg-cyan-500/10",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    hoverBorder: "group-hover:border-cyan-200 dark:group-hover:border-cyan-800",
    accentLine: "from-cyan-500 to-blue-600",
    size: "small",
    tag: null,
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
      { threshold: 0.1 }
    );
    if (stepsRef.current) observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-slate-50/50 dark:bg-slate-950 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 mesh-gradient opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ===== HOW IT WORKS ===== */}
        <div ref={stepsRef} className="mb-28">
          <div
            className={`text-center mb-14 transition-all duration-700 ${
              stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                How It Works
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Study Smarter in{" "}
              <span className="text-gradient">4 Simple Steps</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
              Get started in minutes and see results in days.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Connecting dashed line (desktop only) */}
            <div className="hidden md:block absolute top-[2.6rem] left-[15%] right-[15%] h-px">
              <div className="w-full h-full border-t-2 border-dashed border-slate-200 dark:border-slate-700" />
            </div>

            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex flex-col items-center text-center transition-all duration-700 ${
                  stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Icon circle */}
                <div className="relative mb-5 z-10">
                  <div
                    className={`w-20 h-20 rounded-2xl ${step.bg} border-2 ${step.border} flex items-center justify-center shadow-sm bg-white dark:bg-slate-900`}
                  >
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  {/* Step number badge */}
                  <div
                    className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${step.num} text-white text-xs font-black flex items-center justify-center shadow-md`}
                  >
                    {i + 1}
                  </div>
                </div>

                <h3 className="text-base font-display font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  {step.desc}
                </p>

                {/* Arrow (between steps, desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute" style={{ top: "2.3rem", left: `${(i + 1) * 25 - 1}%` }}>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== FEATURES BENTO GRID ===== */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Features
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
            Everything You Need
            <br />
            <span className="text-gradient">to Score a 5</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            AI technology meets proven learning methods to accelerate your AP prep.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {features.map((feature, index) => {
            const isLarge = feature.size === "large";
            return (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-2xl p-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${feature.hoverBorder} hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-500 hover:-translate-y-1.5 cursor-default ${
                  isLarge ? "lg:col-span-2" : ""
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${150 + index * 80}ms` }}
              >
                {/* Bottom gradient accent */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r ${feature.accentLine} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                {/* Hover glow */}
                <div
                  className={`absolute -top-20 -right-20 w-44 h-44 rounded-full ${feature.bgGlow} opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700`}
                />

                {/* Tag badge */}
                {feature.tag && (
                  <div className={`absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gradient-to-r ${feature.gradient} text-white opacity-80`}>
                    {feature.tag}
                  </div>
                )}

                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}
                  >
                    <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                  </div>

                  <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-[15px]">
                    {feature.description}
                  </p>
                </div>

                {/* Shimmer on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  <div className="shimmer w-full h-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
