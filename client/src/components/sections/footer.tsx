import {
  Sparkles,
  ArrowUpRight,
  Mail,
  Github,
  Twitter,
} from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <>
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
