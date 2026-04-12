"use client";

import { UserPlus, Play, MessageSquare, BarChart3, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { LandingStoryContent, LandingStoryHeader, type LandingStoryMeta } from "@/components/sections/landing-story-header";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    desc: "Sign up free and add the AP courses you're taking this year.",
  },
  {
    icon: Play,
    title: "Practice with AI questions",
    desc: "Adaptive MCQs that focus on weak spots and full-length exam-style sets.",
  },
  {
    icon: MessageSquare,
    title: "Read instant explanations",
    desc: "AI breaks down every option so you learn from mistakes, not just scores.",
  },
  {
    icon: BarChart3,
    title: "Track progress & predicted score",
    desc: "Unit mastery, analytics, and a projected AP score that updates as you improve.",
  },
];

const defaultStory: LandingStoryMeta = {
  title: "Why APMaster?",
  tone: "onBrand",
  subtitle:
    "No guesswork — four steps from signup to timed practice, explanations, and a predicted score that updates with you.",
};

export function LandingHowItWorks({ story = defaultStory }: { story?: LandingStoryMeta }) {
  return (
    <section
      id="why-apmaster"
      className="landing-story-snap scroll-mt-20 border-t border-blue-500/20 bg-blue-600 py-16 text-white md:py-24 dark:border-blue-950/35 dark:bg-[#0a1628]"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <LandingStoryHeader {...story} />

        <LandingStoryContent>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                role="article"
                aria-label={`Step ${i + 1}: ${step.title}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-5% 0px" }}
                transition={{ type: "spring", stiffness: 85, damping: 22, delay: 0.05 * i }}
                className="flex min-h-0 w-full min-w-0 items-center gap-2.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-white/20 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/[0.14]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <step.icon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold leading-snug text-white">{step.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-blue-100/90">{step.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/90 opacity-80" strokeWidth={2.5} />
              </motion.div>
            ))}
          </div>
        </LandingStoryContent>
      </div>
    </section>
  );
}
