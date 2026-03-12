"use client";

import { Crown } from "lucide-react";

interface APScoreCircleProps {
  score: number | null;
  color: string;
  size?: "sm" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
};

const crownSizes = {
  sm: 20,
  lg: 28,
};

export function APScoreCircle({ score, color, size = "sm", className = "" }: APScoreCircleProps) {
  const showCrown = score === 5;
  const crownSize = crownSizes[size];

  return (
    <div
      className={`relative flex items-center justify-center rounded-full text-white font-bold shadow-md ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
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
