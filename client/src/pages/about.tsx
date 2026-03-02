import Navigation from "@/components/ui/navigation";
import Footer from "@/components/sections/footer";
import { Sparkles, Target, Heart, ArrowRight, Zap, Shield } from "lucide-react";
import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="absolute inset-0 mesh-gradient-intense pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Our Mission
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
            About{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              APMaster
            </span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            Democratizing elite-level AP preparation for every student.
          </p>
        </div>
      </section>

      {/* Main content — structured sections */}
      <section className="relative py-16 md:py-24 bg-slate-50/50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          {/* Pull quote */}
          <div className="rounded-2xl border-l-4 border-emerald-500 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 shadow-sm">
            <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white leading-snug italic">
              AP success shouldn't come with a price tag.
            </p>
          </div>

          {/* The Problem */}
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm">1</span>
              The problem
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Too many students face AP exams feeling unprepared—not because they lack ability, but because
              high-quality resources are locked behind paywalls. Traditional test prep has become expensive,
              stressful, and unequal, creating gaps where opportunity should exist.
            </p>
          </div>

          {/* Our Mission */}
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </span>
              Our mission
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              We're here to close that gap. APMaster is designed to make elite-level AP preparation accessible to
              every student, regardless of background.
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong className="text-slate-900 dark:text-white">AI + adaptive learning</strong> — practice that adapts to you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong className="text-slate-900 dark:text-white">Thoughtful design</strong> — studying that feels like a partner, not a chore</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong className="text-slate-900 dark:text-white">Confidence-building</strong> — real feedback, not just grades</span>
              </li>
            </ul>
          </div>

          {/* How we do it — two cards */}
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </span>
              How we do it
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Technology that teaches</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  AI goes beyond static textbooks. Real-time feedback, targeted practice, and explanations that
                  adjust to how you learn—so you can fix weaknesses faster and study on your own terms.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">People at the core</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  We don't believe technology should replace people. APMaster is built with student voices,
                  educator insight, and a commitment to accuracy, clarity, and fairness.
                </p>
              </div>
            </div>
          </div>

          {/* Vision block */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/10 dark:to-teal-500/10 p-8 border border-emerald-200/60 dark:border-emerald-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">
                  Our vision
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  To democratize AP education, remove financial and structural barriers, and empower students
                  everywhere to reach their full academic potential.
                </p>
              </div>
            </div>
          </div>

          {/* Promise */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-900 dark:text-white mb-1">Our promise</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                No gatekeeping. No unnecessary stress. Just smarter, more accessible learning. APMaster exists to
                prove that excellence in education should be available to everyone, not just a few.
              </p>
            </div>
          </div>

          {/* CTA to Team */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm w-full sm:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Heart className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-display font-bold text-slate-900 dark:text-white text-lg">
                  Meet the people behind APMaster
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Co-founders passionate about accessible education
                </p>
              </div>
              <Link
                href="/team"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all group flex-shrink-0"
              >
                Our Team
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
