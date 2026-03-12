"use client";

import { Crown } from "lucide-react";

interface APScoreCircleProps {
  score: number | null;
  color: string;
  size?: "sm" | "lg";
  variant?: "default" | "dashboard";
  className?: string;
}

const sizeClasses = {
  sm: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
  dashboard: "w-10 h-10 text-lg",
};

const crownSizes = {
  sm: 20,
  lg: 28,
  dashboard: 16,
};

export function APScoreCircle({ score, color, size = "sm", variant = "default", className = "" }: APScoreCircleProps) {
  const showCrown = score === 5;
  const isDashboard = variant === "dashboard";
  const sizeKey = isDashboard ? "dashboard" : size;
  const crownSize = crownSizes[sizeKey];

  const baseClasses = `relative flex items-center justify-center rounded-full font-bold shadow-md ${sizeClasses[sizeKey]} ${className}`;
  const style = isDashboard
    ? { backgroundColor: "white", borderWidth: 2, borderStyle: "solid" as const, borderColor: color }
    : { backgroundColor: color };

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
      <span>{score !== null ? score : "?"}</span>
    </div>
  );
}
