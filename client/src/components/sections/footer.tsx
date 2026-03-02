import {
  Sparkles,
  ArrowUpRight,
  Mail,
  Github,
  Twitter,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <>
      {/* CTA Banner */}
      <section className="relative py-20 md:py-28 bg-slate-950 overflow-hidden">
        {/* Glow bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/8 rounded-full blur-[80px]" />
        </div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">
              Join 5,000+ students already acing their AP exams
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-white mb-6 tracking-tight leading-tight">
            Ready to Score a{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              5?
            </span>
          </h2>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Start your free personalized AP prep today. No credit card, no catch — 
            just smarter studying.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <button className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_32px_rgba(16,185,129,0.35)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 text-base group">
                Start Learning Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/learn">
              <button className="inline-flex items-center justify-center gap-2 border-2 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 hover:bg-slate-800/50 text-base">
                Browse Courses
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-950 text-white overflow-hidden border-t border-slate-800/60">
        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        {/* Subtle mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-emerald-500/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-500/3 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

            {/* Brand column */}
            <div className="md:col-span-5">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold">
                  APMaster
                </span>
              </Link>
              <p className="text-slate-400 max-w-sm leading-relaxed mb-6 text-sm">
                AI-powered AP exam preparation designed to help every student
                master their exams with personalized learning and adaptive practice.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-2.5">
                {[
                  { href: "#", icon: Twitter, label: "Twitter" },
                  { href: "#", icon: Github, label: "GitHub" },
                  { href: "mailto:apmaster-contact@gmail.com", icon: Mail, label: "Email" },
                ].map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    title={label}
                    className="group/social w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 border border-slate-700/50 hover:border-emerald-500/40 flex items-center justify-center transition-all duration-300"
                  >
                    <Icon className="w-4 h-4 text-slate-400 group-hover/social:text-emerald-400 transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Spacer */}
            <div className="md:col-span-1" />

            {/* Quick Links */}
            <div className="md:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Browse Courses", href: "/learn" },
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Profile", href: "/profile" },
                  { label: "About Us", href: "/about" },
                  { label: "Our Team", href: "/team" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group/link flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors text-sm font-medium"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="md:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">
                Support
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Help Center", href: "#" },
                  { label: "Contact Us", href: "mailto:apmaster-contact@gmail.com" },
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group/link flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors text-sm font-medium"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800/80 pt-7 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} APMaster. All rights reserved.
            </p>
            <p className="text-slate-600 text-xs font-medium">
              Built with AI for the next generation of learners.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
