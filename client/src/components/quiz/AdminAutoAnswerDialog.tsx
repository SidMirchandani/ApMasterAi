"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDisplayCorrectLabel } from "@/lib/mcqDisplay";

type QuestionLike = { answerIndex: number };

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getWrongLabel(question: QuestionLike, mcqOptionCount: number | undefined): string {
  const correct = getDisplayCorrectLabel(question, mcqOptionCount);
  const labels = mcqOptionCount === 4 ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E"];
  const wrong = labels.find((l) => l !== correct);
  return wrong ?? "A";
}

interface AdminAutoAnswerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionLike[];
  mcqOptionCount?: number;
  onApply: (answers: { [key: number]: string }) => void;
}

/**
 * Admin-only dialog: set a target grade %, then auto-fill answers so that
 * exactly that percentage are correct (shuffled so which ones are correct is random).
 */
export function AdminAutoAnswerDialog({
  open,
  onOpenChange,
  questions,
  mcqOptionCount,
  onApply,
}: AdminAutoAnswerDialogProps) {
  const [targetPercent, setTargetPercent] = useState(75);
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const pct = Math.min(100, Math.max(0, targetPercent));
    const n = questions.length;
    if (n === 0) {
      setError("No questions");
      return;
    }
    const numCorrect = Math.round((n * pct) / 100);
    const indices = shuffle(questions.map((_, i) => i));
    const answers: { [key: number]: string } = {};
    indices.forEach((idx, i) => {
      const q = questions[idx];
      const correctLabel = getDisplayCorrectLabel(q, mcqOptionCount);
      answers[idx] = i < numCorrect ? correctLabel : getWrongLabel(q, mcqOptionCount);
    });
    setError(null);
    onApply(answers);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-answer (Admin)</DialogTitle>
          <DialogDescription>
            Set a target grade percentage. Answers will be filled so that exactly that percentage are correct, then you can submit.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="target-pct" className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">
              Target %
            </label>
            <input
              id="target-pct"
              type="number"
              min={0}
              max={100}
              value={targetPercent}
              onChange={(e) => setTargetPercent(Number(e.target.value) || 0)}
              className="col-span-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply & fill answers</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
