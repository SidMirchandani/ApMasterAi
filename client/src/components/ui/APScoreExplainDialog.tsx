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
      We estimate your AP score using our proprietary scoring model and subject-specific AP calibration.
    </p>
    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
      <li>
        <strong className="text-gray-800 dark:text-gray-200">We combine multiple performance signals.</strong> Our model weights evidence by relevance and quality.
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">If full-length and unit evidence both exist,</strong> we use the stronger signal at the unit level.
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">If no full-length evidence exists,</strong> we project from unit-level evidence only.
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">If evidence is insufficient,</strong> we show <span className="font-semibold">N/A</span> instead of forcing a score.
      </li>
      <li>
        <strong className="text-gray-800 dark:text-gray-200">Final conversion:</strong> the model output is mapped to AP 1-5 using subject-specific calibration.
      </li>
    </ol>
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
