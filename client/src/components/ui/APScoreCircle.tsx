"use client";

import { Crown } from "lucide-react";

interface APScoreCircleProps {
  score: number | null;
  color: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "dashboard";
  /** With size lg, use a slightly smaller circle below the sm breakpoint (narrow cards / mobile). */
  responsive?: boolean;
  className?: string;
  emptyLabel?: string;
}

const sizeClasses = {
  sm: "w-14 h-14 text-2xl",
  md: "w-[4.5rem] h-[4.5rem] text-3xl",
  lg: "w-20 h-20 text-4xl",
  dashboard: "w-10 h-10 text-lg",
};

const crownSizes = {
  sm: 20,
  md: 24,
  lg: 28,
  dashboard: 16,
};

export function APScoreCircle({
  score,
  color,
  size = "sm",
  variant = "default",
  responsive = false,
  className = "",
  emptyLabel = "?",
}: APScoreCircleProps) {
  const showCrown = score === 5;
  const isDashboard = variant === "dashboard";
  const sizeKey = isDashboard ? "dashboard" : size;
  /** Slightly smaller crown when the circle scales down via responsive lg classes. */
  const crownSize =
    responsive && size === "lg" && !isDashboard ? 26 : crownSizes[sizeKey];

  const responsiveLgClasses =
    responsive && size === "lg" && !isDashboard
      ? "w-[4.5rem] h-[4.5rem] text-3xl sm:w-20 sm:h-20 sm:text-4xl"
      : null;

  const dimensionClasses = responsiveLgClasses ?? sizeClasses[sizeKey];
  const baseClasses = `relative flex items-center justify-center rounded-full font-bold shadow-md ${dimensionClasses} ${className}`;
  const style = isDashboard
    ? { backgroundColor: "white", borderWidth: 2, borderStyle: "solid" as const, borderColor: color }
    : { backgroundColor: color };

  const displayText = score !== null ? String(score) : emptyLabel;
  const textClass = displayText.length > 1 ? "text-xs tracking-wide" : "";

  return (
    <div
      className={`${baseClasses} ${isDashboard ? "text-black" : "text-white"}`}
      style={style}
    >
      {showCrown && (
        <Crown
          className="absolute left-1/2 -translate-x-1/2 drop-shadow-sm pointer-events-none fill-[#FFD700] stroke-[#FFD700]"
          style={{ top: "2px" }}
          size={crownSize}
          strokeWidth={2}
          aria-hidden
        />
      )}
      <span className={textClass}>{displayText}</span>
    </div>
  );
}
