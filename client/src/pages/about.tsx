import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { Sparkles, Target, Heart, ArrowRight, Zap, Shield } from "lucide-react";
import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-6 pb-8 md:pt-8 md:pb-10">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              Our Mission
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            About{" "}
            <span className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 bg-clip-text text-transparent">
              APMaster
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-snug">
            Democratizing elite-level AP preparation for every student.
          </p>
        </div>
      </section>

      {/* Main content — structured sections */}
      <section className="relative py-5 md:py-6 bg-slate-50 dark:bg-[#0B0F1A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Pull quote */}
          <div className="rounded-xl border-l-4 border-blue-500 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm transition-all duration-150 ease-out">
            <p className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white leading-snug italic text-center">
              AP success shouldn't come with a price tag.
            </p>
          </div>

          {/* The Problem */}
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs">1</span>
              The problem
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Too many students face AP exams feeling unprepared—not because they lack ability, but because
              high-quality resources are locked behind paywalls. Traditional test prep has become expensive,
              stressful, and unequal, creating gaps where opportunity should exist.
            </p>
          </div>

          {/* Our Mission */}
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-white" />
              </span>
              Our mission
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mb-2">
              We're here to close that gap. APMaster is designed to make elite-level AP preparation accessible to
              every student, regardless of background.
            </p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span><strong className="text-slate-900 dark:text-white">AI + adaptive learning</strong> — practice that adapts to you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span><strong className="text-slate-900 dark:text-white">Thoughtful design</strong> — studying that feels like a partner, not a chore</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span><strong className="text-slate-900 dark:text-white">Confidence-building</strong> — real feedback, not just grades</span>
              </li>
            </ul>
          </div>

          {/* How we do it — two cards */}
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </span>
              How we do it
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 ease-out">
                <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Technology that teaches</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  AI goes beyond static textbooks. Real-time feedback, targeted practice, and explanations that
                  adjust to how you learn—so you can fix weaknesses faster and study on your own terms.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 ease-out">
                <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1">People at the core</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  We don't believe technology should replace people. APMaster is built with student voices,
                  educator insight, and a commitment to accuracy, clarity, and fairness.
                </p>
              </div>
            </div>
          </div>

          {/* Vision block */}
          <div className="rounded-xl bg-blue-50/80 dark:bg-blue-500/10 p-4 border border-blue-200/60 dark:border-blue-500/20 transition-all duration-150 ease-out">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-slate-900 dark:text-white mb-1">
                  Our vision
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                  To democratize AP education, remove financial and structural barriers, and empower students
                  everywhere to reach their full academic potential.
                </p>
              </div>
            </div>
          </div>

          {/* Promise */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all duration-150 ease-out">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white mb-0.5">Our promise</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                No gatekeeping. No unnecessary stress. Just smarter, more accessible learning. APMaster exists to
                prove that excellence in education should be available to everyone, not just a few.
              </p>
            </div>
          </div>

          {/* CTA to Team */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 ease-out w-full sm:w-auto">
              <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-display font-bold text-slate-900 dark:text-white text-base">
                  Meet the people behind APMaster
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Co-founders passionate about accessible education
                </p>
              </div>
              <Link
                href="/team"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] group flex-shrink-0"
              >
                Our Team
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SimpleFooter />
    </div>
  );
}
