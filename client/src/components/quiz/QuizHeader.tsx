import { Button } from "@/components/ui/button";
import { Clock, Flag, BookOpen, Calculator, FileText, MoreVertical, LogOut, ChevronDown } from "lucide-react";
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
import React, { useState, useEffect, useRef } from 'react';


interface ExamDirections {
  title: string;
  sections?: Array<{
    title: string;
    details: string;
    description?: string;
  }>;
  breakdown?: Array<{ name: string; weight: string }>; // Changed to handle objects
  units?: Array<{ name: string; weight: string }>;
  bigIdeas?: Array<{ name: string; weight: string }>;
}

interface QuizHeaderProps {
  title: string;
  timeElapsed: number;
  onHideTimer?: () => void;
  timerHidden?: boolean;
  onExitExam?: () => void;
  isLastQuestion?: boolean;
  onGoToReview?: () => void;
  examDirections?: ExamDirections;
  totalTimeSeconds: number; // Total time for the exam
  onTimerEnd?: () => void; // Callback when timer hits 0
  onTimerTick?: (remainingSeconds: number) => void; // Callback on each tick
  initialTimeRemaining?: number; // For restoring saved state
}

// Define time limits for different exams (in minutes)
const EXAM_TIME_LIMITS: { [key: string]: number } = {
  "AP Macro": 70,
  "AP Micro": 70,
  "AP Psych": 70,
  "AP Gov": 80,
  "AP Chem": 90,
  "APCSP": 120,
};

export function QuizHeader({
  title,
  timeElapsed,
  onHideTimer,
  timerHidden = false,
  onExitExam,
  isLastQuestion = false,
  onGoToReview,
  examDirections,
  totalTimeSeconds,
  onTimerEnd,
  onTimerTick,
  initialTimeRemaining,
}: QuizHeaderProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(initialTimeRemaining);
  const [isLowTime, setIsLowTime] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If initialTimeRemaining is provided, use it. Otherwise, use totalTimeSeconds.
    setTimeRemaining(initialTimeRemaining !== undefined ? initialTimeRemaining : totalTimeSeconds);
  }, [totalTimeSeconds, initialTimeRemaining]);

  useEffect(() => {
    if (timeRemaining !== undefined && timeRemaining > 0 && !timerHidden) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime !== undefined) {
            const newTime = prevTime - 1;
            // Check for 10-minute warning
            if (newTime <= 600 && !isLowTime) { // 10 minutes = 600 seconds
              setIsLowTime(true);
              // Optionally, you can trigger a visual alert or sound here
            } else if (newTime > 600 && isLowTime) {
              setIsLowTime(false);
            }

            if (newTime === 0) {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
              }
              if (onTimerEnd) {
                onTimerEnd(); // Trigger auto-submit
              }
              return 0;
            }
            if (onTimerTick) {
              onTimerTick(newTime); // Pass remaining time to parent
            }
            return newTime;
          }
          return prevTime;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      // Timer has already reached zero, ensure it's marked as low time if applicable
      if (totalTimeSeconds <= 600) {
        setIsLowTime(true);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timeRemaining, timerHidden, onTimerEnd, onTimerTick, isLowTime, totalTimeSeconds]);


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

  // Extract short subject code from title (e.g., "AP® Computer Science Principles" -> "APCSP")
  const getShortTitle = (fullTitle: string) => {
    if (fullTitle.includes("Computer Science Principles")) return "APCSP";
    if (fullTitle.includes("Macroeconomics")) return "AP Macro";
    if (fullTitle.includes("Microeconomics")) return "AP Micro";
    if (fullTitle.includes("Review")) return "Review";
    // Default fallback
    return fullTitle.replace("AP® ", "AP ").substring(0, 20);
  };

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop: single row */}
        <div className="hidden md:flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {title}
              </h1>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900">
                    Directions <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[600px] sm:w-[700px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-xl font-bold">Please read the below directions carefully.</SheetTitle>
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
            <div className={`flex items-center gap-2 text-sm font-medium ${isLowTime ? 'text-orange-600' : ''}`}>
              <Clock className="h-5 w-5" />
              <span className="hidden sm:inline">
                {timeRemaining !== undefined ? formatCountdown(timeRemaining) : formatTime(timeElapsed)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title="Highlight and Notes">
                <Flag className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" title="Calculator">
                <Calculator className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" title="Reference">
                <FileText className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More">
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
          {/* First row: Title and Directions */}
          <div className="flex flex-col items-center">
            <h1 className="text-base font-semibold text-gray-900">
              {getShortTitle(title)}
            </h1>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-gray-600 hover:text-gray-900">
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

          {/* Second row: Timer and tools */}
          <div className="flex justify-between items-center h-10 mt-1">
            <div className={`flex items-center gap-2 text-sm font-medium ${isLowTime ? 'text-orange-600' : ''}`}>
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">
                {timeRemaining !== undefined ? formatCountdown(timeRemaining) : formatTime(timeElapsed)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Highlight and Notes">
                <Flag className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Calculator">
                <Calculator className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Reference">
                <FileText className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="More">
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