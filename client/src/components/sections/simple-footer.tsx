import Link from "next/link";

export default function SimpleFooter() {
  const linkClass =
    "text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors";

  return (
    <footer className="landing-band-light relative border-t border-slate-200/90 dark:border-slate-800/90 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="space-y-2">
            <p className="font-display font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              APMaster
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm leading-relaxed">
              Built with AI for the next generation of learners — free AP prep that adapts to you.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/about" className={linkClass}>
              About
            </Link>
            <Link href="/team" className={linkClass}>
              Team
            </Link>
            <Link href="/learn" className={linkClass}>
              Courses
            </Link>
            <Link href="/login" className={linkClass}>
              Log in
            </Link>
          </nav>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <p className="text-slate-500 dark:text-slate-500 text-xs font-medium text-center md:text-left">
            © {new Date().getFullYear()} APMaster. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
