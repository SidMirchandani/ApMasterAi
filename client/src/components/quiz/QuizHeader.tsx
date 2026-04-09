import { Button } from "@/components/ui/button";
import { Clock, MoreVertical, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ExamToolbar } from "./ExamToolbar";


interface ExamDirections {
  title: string;
  sections?: Array<{
    title: string;
    details: string;
    description?: string;
  }>;
  breakdown?: string[] | Array<{ name: string; weight: string }>;
  units?: Array<{ name: string; weight: string }>;
  bigIdeas?: Array<{ name: string; weight: string }>;
}

interface QuizHeaderProps {
  title: string;
  timeElapsed: number;
  timeRemaining?: number; // Time remaining in seconds for countdown
  onHideTimer?: () => void;
  timerHidden?: boolean;
  onExitExam?: () => void;
  isLastQuestion?: boolean;
  onGoToReview?: () => void;
  examDirections?: ExamDirections;
  subjectId?: string;
  /** AP Classroom–style navy header and light content framing (AP Biology full-length). */
  headerVariant?: "default" | "apclassroom";
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
  examDirections,
  subjectId,
  headerVariant = "default",
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

  return (
    <div
      className={
        isApClass
          ? "border-b border-[#0d2137] bg-[#1a2b42] sticky top-0 z-50 shadow-md"
          : "border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm"
      }
    >
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
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      isApClass
                        ? "h-6 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                        : "h-6 px-2 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg"
                    }
                  >
                    Directions <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[600px] sm:w-[700px] overflow-y-auto rounded-r-2xl border-slate-200 dark:border-slate-700">
                  <SheetHeader>
                    <SheetTitle className="text-xl font-display font-bold text-slate-900 dark:text-white">Please read the directions carefully.</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4 text-sm">
                    {examDirections ? (
                      <>
                        <h3 className="font-bold text-base">{examDirections.title}</h3>

                        {examDirections.sections?.map((section, idx) => (
                          <div key={idx}>
                            <h4 className="font-semibold">{section.title}</h4>
                            <p className="font-medium">{section.details}</p>
                            {section.description && <p className="mt-2">{section.description}</p>}
                          </div>
                        ))}

                        {examDirections.breakdown && (
                          <ul className="list-disc pl-5 space-y-1">
                            {examDirections.breakdown.map((item, idx) => (
                              <li key={idx}>
                                {typeof item === 'string' ? item : `${item.name}: ${item.weight}`}
                              </li>
                            ))}
                          </ul>
                        )}

                        {examDirections.units && (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-blue-50">
                                <tr>
                                  <th className="text-left p-2 font-semibold">Units</th>
                                  <th className="text-right p-2 font-semibold">Exam Weighting</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {examDirections.units.map((unit, idx) => (
                                  <tr key={idx}>
                                    <td className="p-2">{unit.name}</td>
                                    <td className="p-2 text-right font-semibold text-blue-700">{unit.weight}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {examDirections.bigIdeas && (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-blue-50">
                                <tr>
                                  <th className="text-left p-2 font-semibold">Big Ideas</th>
                                  <th className="text-right p-2 font-semibold">Exam Weighting</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {examDirections.bigIdeas.map((idea, idx) => (
                                  <tr key={idx}>
                                    <td className="p-2">{idea.name}</td>
                                    <td className="p-2 text-right font-semibold text-blue-700">{idea.weight}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <p>Each of the questions is followed by four suggested answers. Select the best answer for each question.</p>
                      </>
                    ) : (
                      <>
                        <p>This AP® Practice Exam has 50 multiple-choice questions and lasts 90 minutes.</p>
                        <p>Each of the questions is followed by four suggested answers. Select the one that best answers each question.</p>
                      </>
                    )}

                    <p>A calculator is allowed in this section. You may use a handheld calculator or the calculator available in their application.</p>
                    <p>Reference information is available in this application and can be accessed throughout the exam.</p>
                    <p>You can go back and forth between questions in this section until time expires. The clock will turn red when 5 minutes remain—<strong>the proctor will not give you any time updates or warnings.</strong></p>
                    <p className="mt-6"><strong>Copyright:</strong> "AP®" is a registered trademark of the College Board. The College Board is not affiliated with, nor does it endorse, this product. This is not an official test provided by the College Board. The user interface (UI) is intended solely for educational purposes and aims to mimic the appearance of the official Bluebook interface.</p>
                  </div>
                </SheetContent>
              </Sheet>
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="More"
                    className={isApClass ? "text-white/90 hover:bg-white/10" : undefined}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onExitExam && (
                    <DropdownMenuItem onClick={onExitExam}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Exit to Main</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile: two rows */}
        <div className="md:hidden py-2">
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
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    isApClass
                      ? "h-5 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                      : "h-5 px-2 text-xs text-slate-500 hover:text-emerald-600 rounded-lg"
                  }
                >
                  Directions <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[90vw] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-lg font-bold">Please read the below directions carefully.</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4 text-sm">
                  {examDirections ? (
                    <>
                      <h3 className="font-bold text-base">{examDirections.title}</h3>

                      {examDirections.sections?.map((section, idx) => (
                        <div key={idx}>
                          <h4 className="font-semibold">{section.title}</h4>
                          <p className="font-medium">{section.details}</p>
                          {section.description && <p className="mt-2">{section.description}</p>}
                        </div>
                      ))}

                      {examDirections.breakdown && (
                        <ul className="list-disc pl-5 space-y-1">
                          {examDirections.breakdown.map((item, idx) => (
                            <li key={idx}>
                              {typeof item === 'string' ? item : `${item.name}: ${item.weight}`}
                            </li>
                          ))}
                        </ul>
                      )}

                      {examDirections.units && (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="text-left p-2 font-semibold">Units</th>
                                <th className="text-right p-2 font-semibold">Exam Weighting</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {examDirections.units.map((unit, idx) => (
                                <tr key={idx}>
                                  <td className="p-2">{unit.name}</td>
                                  <td className="p-2 text-right font-semibold text-blue-700">{unit.weight}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {examDirections.bigIdeas && (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="text-left p-2 font-semibold">Big Ideas</th>
                                <th className="text-right p-2 font-semibold">Exam Weighting</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {examDirections.bigIdeas.map((idea, idx) => (
                                <tr key={idx}>
                                  <td className="p-2">{idea.name}</td>
                                  <td className="p-2 text-right font-semibold text-blue-700">{idea.weight}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <p>Each of the questions is followed by four suggested answers. Select the best answer for each question.</p>
                    </>
                  ) : (
                    <>
                      <p>This AP® Practice Exam has 50 multiple-choice questions and lasts 90 minutes.</p>
                      <p>Each of the questions is followed by four suggested answers. Select the one that best answers each question.</p>
                    </>
                  )}

                  <p>A calculator is allowed in this section. You may use a handheld calculator or the calculator available in their application.</p>
                  <p>Reference information is available in this application and can be accessed throughout the exam.</p>
                  <p>You can go back and forth between questions in this section until time expires. The clock will turn red when 5 minutes remain—<strong>the proctor will not give you any time updates or warnings.</strong></p>
                  <p className="mt-6"><strong>Copyright:</strong> "AP®" is a registered trademark of the College Board. The College Board is not affiliated with, nor does it endorse, this product. This is not an official test provided by the College Board. The user interface (UI) is intended solely for educational purposes and aims to mimic the appearance of the official Bluebook interface.</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex justify-between items-center h-10 mt-1">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={isApClass ? "h-8 w-8 text-white/90 hover:bg-white/10" : "h-8 w-8"}
                    title="More"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onExitExam && (
                    <DropdownMenuItem onClick={onExitExam}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Exit to Main</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}