import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, CheckCircle, Zap, Shield, BookOpen, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const faqs = [
  {
    question: "What is APMaster.ai?",
    answer:
      "APMaster.ai is an AI-powered study platform designed specifically for AP students. It combines adaptive practice questions, instant AI explanations, and detailed progress analytics to help you score a 5 — all completely free.",
  },
  {
    question: "How does the AI help me study?",
    answer:
      "Our AI analyzes your performance across every unit and question type. It identifies knowledge gaps in real time, provides detailed step-by-step explanations for every question, and focuses your practice on areas where you need the most improvement. The more you practice, the smarter it gets.",
  },
  {
    question: "Is APMaster.ai free to use?",
    answer:
      "Yes — APMaster.ai is 100% free. We believe every student deserves access to high-quality AP prep, regardless of their resources. Our full question bank, AI explanations, and progress tracking are all included at no cost.",
  },
  {
    question: "Which AP subjects do you support?",
    answer:
      "We currently support major AP subjects including AP Macroeconomics, AP Computer Science Principles, AP Chemistry, and more — with new subjects added regularly. Each course includes comprehensive unit coverage aligned with the official College Board curriculum.",
  },
  {
    question: "How is my predicted AP score calculated?",
    answer: (
      <div className="space-y-4">
        <p>
          Your predicted AP score is an estimate based on your practice test results and the exam&apos;s scoring curve. Here&apos;s how we calculate it:
        </p>
        <ol className="list-decimal list-inside space-y-2 pl-0.5">
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Your average %</strong> from your diagnostic test and full-length tests is treated as your multiple-choice (MCQ) performance.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">We project free-response (FRQ) performance</strong> from that, using a subject-specific factor (FRQs are typically harder, so we scale down slightly).
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">We combine MCQ + projected FRQ</strong> using the exam&apos;s official weights (e.g. 67% MCQ / 33% FRQ) into a composite score.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">That composite</strong> is compared to the subject&apos;s cutoffs (College Board–style curves) to get your 1–5 score.
          </li>
        </ol>
        <p className="text-slate-500 dark:text-slate-500 text-[13px]">
          Example: 80% average → projected FRQ ~68% → composite points → maps to a 4 or 5 depending on the subject&apos;s curve.
        </p>
        <p>
          It updates automatically as you take more diagnostic and full-length tests.
        </p>
      </div>
    ),
  },
];

const perks = [
  {
    icon: Zap,
    title: "Start in minutes",
    desc: "No credit card. No setup. Just create an account and start practicing.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    icon: CheckCircle,
    title: "Aligned with College Board",
    desc: "Every question maps directly to the official AP curriculum and exam format.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "Always free",
    desc: "No paywalls, no limits. Access every feature, every question, at no cost.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: BookOpen,
    title: "Learn from every mistake",
    desc: "AI explanations teach you the concept behind every question, not just the answer.",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
];

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="landing-band-muted relative py-24 md:py-32 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white dark:from-[#0B0F1A] to-transparent pointer-events-none z-[1]" />
      {/* Subtle bg decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* LEFT: heading + perks */}
          <div
            className={`lg:col-span-2 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="lg:sticky lg:top-24">
              {/* Badge */}
              <div className="landing-eyebrow landing-eyebrow--violet mb-6">
                <HelpCircle className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-[11px]">FAQ</span>
              </div>

              <h2 className="landing-section-title mb-4 leading-tight">
                Got Questions?<br />
                <span className="text-gradient">We&apos;ve Got Answers.</span>
              </h2>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed max-w-sm">
                Everything you need to know about getting started and scoring a 5 with APMaster.ai.
              </p>

              {/* Perks list */}
              <div className="space-y-4">
                {perks.map((perk, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-2xl bg-white/90 dark:bg-[#0C121C] border border-slate-200/80 dark:border-slate-800 transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    }`}
                    style={{ transitionDelay: `${200 + i * 100}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-xl ${perk.bg} flex items-center justify-center flex-shrink-0`}>
                      <perk.icon className={`w-5 h-5 ${perk.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                        {perk.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {perk.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Accordion */}
          <div
            className={`lg:col-span-3 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={`group relative bg-white dark:bg-[#0C121C] border border-slate-200/90 dark:border-slate-800 rounded-2xl px-6 overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md data-[state=open]:border-violet-200/90 dark:data-[state=open]:border-violet-800/50 data-[state=open]:shadow-lg data-[state=open]:shadow-violet-500/[0.07] ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${300 + index * 80}ms` }}
                >
                  {/* Colored left bar when open */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-violet-500 to-purple-600 opacity-0 group-data-[state=open]:opacity-100 transition-opacity duration-300 rounded-l-2xl" />

                  <AccordionTrigger className="text-left font-semibold text-slate-800 dark:text-slate-200 hover:no-underline py-5 text-[15px] pr-2 group-data-[state=open]:text-violet-700 dark:group-data-[state=open]:text-violet-300 transition-colors duration-200">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 dark:text-slate-400 pb-5 leading-relaxed text-[14px]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Still have questions? */}
            <div
              className={`mt-8 p-6 rounded-2xl bg-white/80 dark:bg-[#0C121C]/80 backdrop-blur-sm border border-slate-200/90 dark:border-slate-700/90 shadow-sm transition-all duration-700 delay-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Still have questions?
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                We&apos;d love to hear from you. Reach out and we&apos;ll get back to you quickly.
              </p>
              <a
                href="mailto:apmaster-contact@gmail.com"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group/link"
              >
                Contact us
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
