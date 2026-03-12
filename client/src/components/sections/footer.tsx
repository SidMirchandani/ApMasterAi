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
      <section className="relative py-20 md:py-28 bg-[#0B0F1A] overflow-hidden">

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">
              Join 5,000+ students already acing their AP exams
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-white mb-6 tracking-tight leading-tight">
            Ready to Score a{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
              5?
            </span>
          </h2>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Start your free personalized AP prep today. No credit card, no catch — 
            just smarter studying.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <button className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl transition-all duration-150 ease-out shadow-sm hover:shadow-md hover:-translate-y-[1px] hover:scale-[1.02] active:scale-[0.98] text-base group">
                Start Learning Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/learn">
              <button className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-bold px-8 py-4 rounded-xl transition-all duration-150 ease-out hover:bg-slate-800/50 text-base">
                Browse Courses
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#0B0F1A] text-white overflow-hidden border-t border-slate-800">
        {/* Gradient separator */}
        <div className="h-px bg-slate-800" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

            {/* Brand column */}
            <div className="md:col-span-5">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
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
                    className="group/social w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-blue-500/20 border border-slate-700/50 hover:border-blue-500/40 flex items-center justify-center transition-all duration-150 ease-out"
                  >
                    <Icon className="w-4 h-4 text-slate-400 group-hover/social:text-blue-400 transition-colors" />
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
                      className="group/link flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors duration-150 ease-out text-sm font-medium"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-150" />
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
                      className="group/link flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors duration-150 ease-out text-sm font-medium"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-150" />
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
