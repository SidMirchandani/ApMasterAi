import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ExamToolbar } from "./ExamToolbar";

interface PracticeQuizHeaderProps {
  title: string;
  onExitExam?: () => void;
  subjectId?: string;
}

export function PracticeQuizHeader({
  title,
  onExitExam,
  subjectId,
}: PracticeQuizHeaderProps) {
  const getShortTitle = (fullTitle: string) => {
    if (fullTitle.includes("Computer Science Principles")) return "AP CSP";
    if (fullTitle.includes("Macroeconomics")) return "AP MACRO";
    if (fullTitle.includes("Microeconomics")) return "AP MICRO";
    if (fullTitle.includes("Chemistry")) return "AP CHEM";
    if (fullTitle.includes("Psychology")) return "AP PSYCH";
    if (fullTitle.includes("Government")) return "AP GOV";
    if (fullTitle.includes("Biology")) return "AP BIO";
    if (fullTitle.includes("Review")) return "Review";
    return fullTitle.replace("AP® ", "AP ").toUpperCase().substring(0, 20);
  };

  return (
    <div className="sticky top-0 z-50 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-[#0B0F1A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hidden h-16 items-center justify-between md:flex">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            <ExamToolbar subjectId={subjectId} size="md" variant="default" />
            {onExitExam && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExitExam}
                title="Exit"
                className="h-9 gap-1.5 px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Exit</span>
              </Button>
            )}
          </div>
        </div>

        <div className="py-1.5 md:hidden">
          <div className="flex flex-col items-center">
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {getShortTitle(title)}
            </h1>
          </div>
          <div className="mt-0.5 flex h-10 items-center justify-center gap-2">
            <ExamToolbar subjectId={subjectId} size="sm" variant="default" />
            {onExitExam && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExitExam}
                title="Exit"
                className="h-8 gap-1 px-2 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Exit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
