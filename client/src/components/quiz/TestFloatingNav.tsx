"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestFloatingNavProps {
  currentIndex: number;
  totalQuestions: number;
  userAnswers: { [key: number]: string };
  flaggedQuestions: Set<number>;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  /** When on last question, right control runs review instead of next index. */
  onEndReview?: () => void;
}

export function TestFloatingNav({
  currentIndex,
  totalQuestions,
  userAnswers,
  flaggedQuestions,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onGoTo,
  onEndReview,
}: TestFloatingNavProps) {
  const [open, setOpen] = useState(false);
  const isLast = currentIndex >= totalQuestions - 1;
  const displayNext = isLast && onEndReview ? onEndReview : onNext;
  const nextDisabled = isLast ? !onEndReview : !canGoNext;

  const cellClass = (i: number) => {
    const answered = !!userAnswers[i];
    const flagged = flaggedQuestions.has(i);
    const current = i === currentIndex;
    const base =
      "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors";
    let cls = base;
    if (current) {
      cls += " bg-blue-600 text-white shadow-md dark:bg-blue-500";
    } else if (answered) {
      cls += " bg-slate-800 text-white dark:bg-slate-600";
    } else {
      cls +=
        " border-2 border-dashed border-slate-300 bg-white text-slate-600 dark:border-slate-500 dark:bg-white dark:text-slate-800";
    }
    if (flagged) {
      cls +=
        " ring-2 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0B0F1A]";
    }
    return cn(cls);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 sm:bottom-6 sm:px-6">
      <div className="pointer-events-auto flex max-w-lg items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 px-2 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/40 sm:gap-2 sm:px-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="h-9 w-9 shrink-0 rounded-full border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          title="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 max-w-[11rem] flex-1 items-center justify-center gap-1 rounded-full px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:max-w-[14rem] dark:text-slate-200 dark:hover:bg-white/10"
            >
              <span className="truncate">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            sideOffset={8}
            className="w-auto max-w-[min(92vw,26rem)] border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 data-[state=closed]:animate-none data-[state=open]:animate-none"
          >
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded bg-blue-600 dark:bg-blue-500" />
                Current
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded bg-slate-800 dark:bg-slate-600" />
                Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded border-2 border-dashed border-slate-300 dark:border-slate-500" />
                Unanswered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded ring-2 ring-red-500 ring-offset-1" />
                Flagged
              </span>
            </div>
            <div className="grid max-h-[min(42vh,15rem)] grid-cols-5 gap-1.5 overflow-y-auto px-1.5 pb-2 pt-1 sm:grid-cols-8 sm:px-2">
              {Array.from({ length: totalQuestions }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cellClass(i)}
                  onClick={() => {
                    onGoTo(i);
                    setOpen(false);
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="icon"
          onClick={displayNext}
          disabled={nextDisabled}
          className="h-9 w-9 shrink-0 rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-30 dark:bg-blue-500 dark:hover:bg-blue-600"
          title={isLast ? "Review" : "Next"}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
