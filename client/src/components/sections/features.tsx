"use client";

import {
  BookOpen,
  TrendingUp,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Feature cards — light: glass on blue with white/light text; dark: tinted wells
const features = [
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Detailed analytics and unit mastery charts keep you on track.",
    iconBg: "bg-white/25 ring-1 ring-inset ring-white/30 dark:bg-indigo-500/10 dark:ring-0",
    iconColor: "text-white dark:text-indigo-400",
    accentColor: "bg-indigo-500",
    tag: null,
    tagStyle: "",
  },
  {
    icon: BookOpen,
    title: "Comprehensive Content",
    description: "All AP subjects with every unit covered in depth.",
    iconBg: "bg-white/25 ring-1 ring-inset ring-white/30 dark:bg-amber-500/10 dark:ring-0",
    iconColor: "text-white dark:text-amber-400",
    accentColor: "bg-amber-500",
    tag: null,
    tagStyle: "",
  },
  {
    icon: Sparkles,
    title: "Instant Explanations",
    description: "AI-generated explanations for every question, instantly.",
    iconBg: "bg-white/25 ring-1 ring-inset ring-white/30 dark:bg-rose-500/10 dark:ring-0",
    iconColor: "text-white dark:text-rose-400",
    accentColor: "bg-rose-500",
    tag: null,
    tagStyle: "",
  },
  {
    icon: Clock,
    title: "Full-Length Tests",
    description: "Simulate real AP exam conditions with timed full-length tests.",
    iconBg: "bg-white/25 ring-1 ring-inset ring-white/30 dark:bg-cyan-500/10 dark:ring-0",
    iconColor: "text-white dark:text-cyan-400",
    accentColor: "bg-cyan-500",
    tag: null,
    tagStyle: "",
  },
];

export function Features() {
  return (
    <section
      id="everything-you-need"
      className="landing-story-snap relative scroll-mt-20 overflow-hidden border-t border-blue-500/20 bg-blue-600 py-16 text-white dark:border-blue-950/35 dark:bg-[#0a1628] md:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.07] to-transparent dark:from-white/[0.04]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ===== FEATURES GRID ===== */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ type: "spring", stiffness: 85, damping: 20 }}
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-200/90">All together</p>
          <h2 className="landing-section-title mb-4 text-3xl capitalize !text-white sm:text-4xl lg:text-[2.75rem]">
            Everything You Need To Score A 5
          </h2>
          <p className="mx-auto max-w-xl text-[16px] leading-relaxed text-blue-100 dark:text-blue-200/90">
            AI technology meets proven learning methods to accelerate your AP prep.
          </p>
        </motion.div>

        {/* Feature bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map((feature, index) => {
            return (
              <motion.div
                key={feature.title}
                className="group relative cursor-default overflow-hidden rounded-xl border border-white/40 bg-white/15 p-6 shadow-lg shadow-blue-900/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/55 hover:bg-white/20 hover:shadow-xl dark:border-slate-700/80 dark:bg-slate-900/75 dark:shadow-slate-900/40 dark:backdrop-blur-md dark:hover:border-slate-600"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8% 0px" }}
                transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.05 * index }}
              >
                {/* Left accent bar: white on hover in light mode; colored in dark */}
                <div
                  className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${feature.accentColor}`}
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

                  <h3 className="mb-2.5 text-[16px] font-bold tracking-tight text-white drop-shadow-sm dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-blue-50/95 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <motion.div
          className="mt-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5% 0px" }}
          transition={{ type: "spring", stiffness: 75, damping: 20, delay: 0.15 }}
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
        </motion.div>
      </div>
    </section>
  );
}
