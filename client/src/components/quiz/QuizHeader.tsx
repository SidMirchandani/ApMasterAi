import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { ExamToolbar } from "./ExamToolbar";

interface QuizHeaderProps {
  title: string;
  timeElapsed: number;
  timeRemaining?: number; // Time remaining in seconds for countdown
  onHideTimer?: () => void;
  timerHidden?: boolean;
  onExitExam?: () => void;
  isLastQuestion?: boolean;
  onGoToReview?: () => void;
  subjectId?: string;
  /** AP Classroom–style navy header and light content framing (AP Biology full-length). */
  headerVariant?: "default" | "apclassroom";
  /** Use long blue dashed divider at the bottom (for test headers). */
  useBlueDashedDivider?: boolean;
}

// Define time limits for different exams in minutes (2026 official MCQ specs; kept in sync with quiz.tsx EXAM_CONFIGS)
const EXAM_TIME_LIMITS: { [key: string]: number } = {
  "AP Macro": 70,
  "AP Micro": 70,
  "AP Psych": 90,
  "AP Gov": 55,
  "AP Chem": 90,
  "APCSP": 120,
  "AP Lang": 60,
  "AP Lit": 60,
  "AP Biology": 90,
  "AP Physics 1": 80,
  "AP Physics 2": 80,
  "AP Computer Science A": 90,
  "AP Environmental Science": 90,
  "AP U.S. History": 55,
  "AP World History: Modern": 55,
  "AP European History": 55,
  "AP Calculus AB": 105,
  "AP Calculus BC": 105,
  "AP Statistics": 90,
  "AP Human Geography": 60,
};

export function QuizHeader({
  title,
  timeElapsed,
  timeRemaining,
  onHideTimer,
  timerHidden = false,
  onExitExam,
  isLastQuestion = false,
  onGoToReview,
  subjectId,
  headerVariant = "default",
  useBlueDashedDivider = false,
}: QuizHeaderProps) {
  // Check if time is low (10 minutes or less)
  const isLowTime = timeRemaining !== undefined && timeRemaining <= 600 && timeRemaining > 0;
  const isApClass = headerVariant === "apclassroom";


  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract short subject code from title (e.g., "AP® Computer Science Principles" -> "AP CSP")
  const getShortTitle = (fullTitle: string) => {
    if (fullTitle.includes("Computer Science Principles")) return "AP CSP";
    if (fullTitle.includes("Macroeconomics")) return "AP MACRO";
    if (fullTitle.includes("Microeconomics")) return "AP MICRO";
    if (fullTitle.includes("Chemistry")) return "AP CHEM";
    if (fullTitle.includes("Psychology")) return "AP PSYCH";
    if (fullTitle.includes("Government")) return "AP GOV";
    if (fullTitle.includes("Biology")) return "AP BIO";
    if (fullTitle.includes("Review")) return "Review";
    // Default fallback
    return fullTitle.replace("AP® ", "AP ").toUpperCase().substring(0, 20);
  };

  const showBlueDash = isApClass || useBlueDashedDivider;

  const headerInner = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop: single row */}
        <div className="hidden md:flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <div>
              <h1
                className={
                  isApClass
                    ? "text-lg font-display font-semibold text-white"
                    : "text-lg font-display font-semibold text-slate-900 dark:text-white"
                }
              >
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                isLowTime
                  ? isApClass
                    ? "text-amber-300"
                    : "text-amber-600 dark:text-amber-400"
                  : isApClass
                    ? "text-white/90"
                    : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Clock className="h-5 w-5" />
              <span className="hidden sm:inline">
                {timeRemaining !== undefined ? formatCountdown(timeRemaining) : formatTime(timeElapsed)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ExamToolbar
                subjectId={subjectId}
                size="md"
                variant={isApClass ? "apclassroom" : "default"}
              />

              {onExitExam && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onExitExam}
                  title="Exit"
                  className={
                    isApClass
                      ? "h-9 gap-1.5 px-3 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                      : "h-9 gap-1.5 px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Exit</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: two rows */}
        <div className="md:hidden py-1.5">
          <div className="flex flex-col items-center">
            <h1
              className={
                isApClass
                  ? "text-base font-display font-semibold text-white"
                  : "text-base font-display font-semibold text-slate-900 dark:text-white"
              }
            >
              {getShortTitle(title)}
            </h1>
          </div>

          <div className="mt-0.5 flex h-10 items-center justify-between">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                isLowTime
                  ? isApClass
                    ? "text-amber-300"
                    : "text-amber-600"
                  : isApClass
                    ? "text-white/90"
                    : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">
                {timeRemaining !== undefined ? formatCountdown(timeRemaining) : formatTime(timeElapsed)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <ExamToolbar
                subjectId={subjectId}
                size="sm"
                variant={isApClass ? "apclassroom" : "default"}
              />

              {onExitExam && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onExitExam}
                  title="Exit"
                  className={
                    isApClass
                      ? "h-8 gap-1 px-2 text-xs font-medium text-white/90 hover:bg-white/10"
                      : "h-8 gap-1 px-2 text-xs font-medium text-slate-600 dark:text-slate-300"
                  }
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

  return (
    <div
      className={
        showBlueDash
          ? "sticky top-0 z-50 flex flex-col gap-0.5"
          : "sticky top-0 z-50 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-[#0B0F1A]"
      }
    >
      {showBlueDash ? (
        <>
          <div className={isApClass ? "bg-[#1a2b42]" : "bg-white dark:bg-[#0B0F1A]"}>{headerInner}</div>
          <div className="ap-long-dash-rule" aria-hidden />
        </>
      ) : (
        headerInner
      )}
    </div>
  );
}