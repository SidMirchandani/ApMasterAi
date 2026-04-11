"use client";

import { UserPlus, Play, MessageSquare, BarChart3, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { LandingStoryContent, LandingStoryHeader, type LandingStoryMeta } from "@/components/sections/landing-story-header";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    desc: "Sign up free and add the AP courses you're taking this year.",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    numBg: "bg-blue-600",
    accentBar: "from-blue-400 to-blue-600",
  },
  {
    icon: Play,
    title: "Practice with AI questions",
    desc: "Adaptive MCQs that focus on weak spots and full-length exam-style sets.",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    numBg: "bg-indigo-600",
    accentBar: "from-indigo-400 to-indigo-600",
  },
  {
    icon: MessageSquare,
    title: "Read instant explanations",
    desc: "AI breaks down every option so you learn from mistakes, not just scores.",
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    numBg: "bg-violet-600",
    accentBar: "from-violet-400 to-violet-600",
  },
  {
    icon: BarChart3,
    title: "Track progress & predicted score",
    desc: "Unit mastery, analytics, and a projected AP score that updates as you improve.",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    numBg: "bg-emerald-600",
    accentBar: "from-emerald-400 to-emerald-600",
  },
];

const defaultStory: LandingStoryMeta = {
  title: "Why APMaster?",
  subtitle:
    "No guesswork — four steps from signup to timed practice, explanations, and a predicted score that updates with you.",
};

export function LandingHowItWorks({ story = defaultStory }: { story?: LandingStoryMeta }) {
  return (
    <section
      id="why-apmaster"
      className="landing-band-light landing-story-snap relative scroll-mt-20 overflow-hidden border-t border-slate-100 py-16 md:py-24 dark:border-slate-800"
    >
      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
          {/* wrapper: flex on md so we can slot chevron arrows between cards */}
          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {steps.map((step, i) => (
              <div key={step.title} className="flex min-w-0 flex-1 flex-col md:flex-row md:items-stretch">
                {/* card */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-5% 0px" }}
                  transition={{ type: "spring", stiffness: 85, damping: 22, delay: 0.06 * i }}
                  className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-white/[0.04]"
                >
                  {/* coloured top bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${step.accentBar}`} />

                  <div className="flex flex-1 flex-col items-center p-6 text-center">
                    <div className="relative mb-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-[#0B0F1A] ${step.iconBg}`}
                      >
                        <step.icon className={`h-7 w-7 ${step.iconColor}`} />
                      </div>
                      <div
                        className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full ${step.numBg} text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-950`}
                      >
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="mb-1.5 text-[15px] font-bold leading-tight text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>

                {/* chevron connector — hidden after last card and on mobile */}
                {i < steps.length - 1 && (
                  <div className="hidden shrink-0 items-center justify-center px-1 md:flex">
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" strokeWidth={2.5} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
