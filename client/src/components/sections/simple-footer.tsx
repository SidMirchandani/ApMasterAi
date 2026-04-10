export default function SimpleFooter() {
  return (
    <footer className="landing-band-light relative border-t border-slate-200/90 dark:border-slate-800/90 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium text-center sm:text-left">
            © {new Date().getFullYear()} APMaster. All rights reserved.
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium text-center sm:text-right">
            Built free for the next generation of learners.
          </p>
        </div>
      </div>
    </footer>
  );
}
