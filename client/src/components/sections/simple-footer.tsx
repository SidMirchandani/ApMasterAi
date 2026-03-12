export default function SimpleFooter() {
  return (
    <footer className="relative bg-slate-50 dark:bg-[#0B0F1A] overflow-hidden border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            © 2026 APMaster. All rights reserved.
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs font-medium">
            Built with AI for the next generation of learners.
          </p>
        </div>
      </div>
    </footer>
  );
}
