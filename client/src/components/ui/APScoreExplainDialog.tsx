"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EXPLANATION = (
  <>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
      Your predicted AP score is an estimate based on your practice test results and the exam's scoring curve. Here's how we calculate it:
    </p>
    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
      <li>
        <strong className="text-gray-800 dark:text-gray-200">Your average %</strong> from your diagnostic test and full-length tests is treated as your multiple-choice (MCQ) performance.
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">We project free-response (FRQ) performance</strong> from that, using a subject-specific factor (FRQs are typically harder, so we scale down slightly).
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">We combine MCQ + projected FRQ</strong> using the exam's official weights (e.g. 67% MCQ / 33% FRQ) into a composite score.
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">That composite</strong> is compared to the subject's cutoffs (College Board–style curves) to get the 1–5 score.
      </li>
    </ol>
    <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
      Example: 80% average → projected FRQ ~68% → composite points → maps to a 4 or 5 depending on the subject's curve.
    </p>
  </>
);

interface APScoreExplainDialogProps {
  /** Optional custom trigger; defaults to Info icon. */
  trigger?: React.ReactNode;
  /** Optional class for the default icon button. */
  triggerClassName?: string;
  /** If true, trigger is inline (e.g. next to label) with no button chrome. */
  inline?: boolean;
}

export function APScoreExplainDialog({
  trigger,
  triggerClassName,
  inline = false,
}: APScoreExplainDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label="How we calculate predicted AP score"
            className={cn(
              "rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 dark:focus:ring-gray-500",
              inline
                ? "p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                : "p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
              triggerClassName
            )}
          >
            <Info className={cn(inline ? "h-3.5 w-3.5" : "h-4 w-4")} />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-left">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
            How we calculate your predicted AP score
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1">{EXPLANATION}</div>
      </DialogContent>
    </Dialog>
  );
}
