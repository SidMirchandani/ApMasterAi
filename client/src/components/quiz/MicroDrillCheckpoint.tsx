"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MicroDrillCheckpointResult } from "@/lib/micro-drill-checkpoint";
import { MICRO_DRILL_MAX_SESSION_QUESTIONS } from "@/lib/micro-drill-checkpoint";
import { cn } from "@/lib/utils";

export function MicroDrillCheckpoint({
  result,
  roundNumber,
  sessionTotal,
  onEnd,
  onContinue,
  loading = false,
}: {
  result: MicroDrillCheckpointResult;
  roundNumber: number;
  sessionTotal: number;
  onEnd: () => void;
  onContinue: () => void;
  loading?: boolean;
}) {
  const recommendEnd = result.recommendation === "end" || result.atSessionCap;
  const showContinue = result.canContinue && !result.atSessionCap;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2 text-center">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Round {roundNumber} · {sessionTotal}/{MICRO_DRILL_MAX_SESSION_QUESTIONS} questions
          </p>
          <CardTitle className="text-lg dark:text-gray-100">{result.headline}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {result.detail}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              disabled={loading}
              className={cn(
                "h-11 w-full rounded-xl font-semibold",
                recommendEnd
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500"
                  : "border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200",
              )}
              variant={recommendEnd ? "default" : "outline"}
              onClick={onEnd}
            >
              {result.endLabel}
            </Button>
            {showContinue ? (
              <Button
                size="lg"
                disabled={loading}
                className={cn(
                  "h-11 w-full rounded-xl font-semibold",
                  !recommendEnd
                    ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500"
                    : "border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200",
                )}
                variant={!recommendEnd ? "default" : "outline"}
                onClick={onContinue}
              >
                {result.continueLabel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
