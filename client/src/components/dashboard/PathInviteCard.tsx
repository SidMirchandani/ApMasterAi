"use client";

import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PathNodeStrip } from "@/components/dashboard/PathNodeStrip";
import type { FastPathSummary } from "@/lib/fast-path-plan";
import { FAST_PATH_COPY } from "@/lib/fast-path-copy";
import { cn } from "@/lib/utils";

export function PathInviteCard({
  summary,
  disabled = false,
  className,
  size = "default",
}: {
  summary: FastPathSummary;
  disabled?: boolean;
  className?: string;
  /** `dashboard` — same width as sibling CTAs, tighter padding */
  size?: "default" | "dashboard";
}) {
  const router = useRouter();
  const isDiagnostic = summary.variant === "diagnostic";
  const isDashboard = size === "dashboard";

  const handleClick = () => {
    if (disabled) return;
    router.push(summary.href);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            disabled={disabled}
            onClick={handleClick}
            whileHover={disabled || isDashboard ? undefined : { scale: 1.02 }}
            whileTap={disabled || isDashboard ? undefined : { scale: 0.98 }}
            className={cn(
              "group relative flex w-full flex-col text-left transition-shadow",
              isDashboard
                ? "min-h-10 rounded-xl py-2.5"
                : "rounded-2xl py-3",
              isDashboard
                ? "shadow-[0_3px_0_0_rgba(0,0,0,0.1)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.1)] active:translate-y-[2px]"
                : "shadow-[0_4px_0_0_rgba(0,0,0,0.12)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.12)] active:translate-y-[3px]",
              isDiagnostic
                ? "bg-gradient-to-b from-amber-400 to-amber-600 text-white"
                : "bg-gradient-to-b from-emerald-400 to-green-600 text-white",
              disabled && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            <div className="flex w-full items-center gap-3 pl-4 pr-3">
              <div className="min-w-0 flex-1">
                {isDashboard ? (
                  <>
                    <p className="text-sm font-extrabold leading-tight tracking-tight">
                      {summary.headline}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium leading-snug text-white/90">
                      {[summary.subline, summary.secondaryLine].filter(Boolean).join(" · ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-extrabold leading-tight tracking-tight">
                      {summary.headline}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-snug text-white/90">
                      {summary.subline}
                    </p>
                    {summary.secondaryLine ? (
                      <p className="mt-0.5 text-[11px] font-medium text-white/75">
                        {summary.secondaryLine}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              <ArrowRight
                className={cn(
                  "shrink-0 text-white/90 transition-transform group-hover:translate-x-0.5",
                  isDashboard ? "h-4 w-4" : "h-5 w-5",
                )}
                aria-hidden
              />
            </div>
            {!isDiagnostic && summary.pathNodesTotal > 0 && !isDashboard ? (
              <div className="mt-2.5 flex items-center gap-2 px-4">
                <PathNodeStrip
                  filled={summary.pathNodesFilled}
                  total={summary.pathNodesTotal}
                />
              </div>
            ) : null}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {FAST_PATH_COPY.timeDisclaimer}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
