import { cn } from "@/lib/utils";

export function PathNodeStrip({
  filled,
  total = 3,
  className,
}: {
  filled: number;
  total?: number;
  className?: string;
}) {
  const n = Math.max(1, Math.min(total, 5));
  const done = Math.min(filled, n);

  return (
    <div className={cn("flex items-center gap-1", className)} aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const isDone = i < done;
        const isLast = i === n - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full ring-2 ring-white/40",
                isDone ? "bg-white" : "bg-white/25",
              )}
            />
            {!isLast && (
              <span
                className={cn(
                  "h-0.5 w-3 rounded-full",
                  i < done - 1 ? "bg-white/70" : "bg-white/25",
                )}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
