import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { CheckCircle } from "lucide-react";

const REPORT_REASONS = [
  "Wrong answer",
  "Typo",
  "Unclear question",
  "Incorrect explanation",
  "Outdated content",
  "Other",
];

interface ReportQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | undefined;
  subjectId: string;
  onSuccess?: () => void;
}

export function ReportQuestionDialog({
  open,
  onOpenChange,
  questionId,
  subjectId,
  onSuccess,
}: ReportQuestionDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setReason("");
      setDetails("");
      setSubmitting(false);
      setSubmitted(false);
      setError(null);
    }
    onOpenChange(open);
  }

  async function handleSubmit() {
    if (!reason || !questionId) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("POST", "/api/user/report-question", {
        questionId,
        subjectId,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      onSuccess?.();
      setTimeout(() => handleOpenChange(false), 1800);
    } catch (err: any) {
      setError(err?.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a Question Error</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Thanks for your report!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We'll review this question and fix any issues.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="report-reason">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="report-reason" className="w-full">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-details">
                  Additional details{" "}
                  <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="report-details"
                  placeholder="Describe the issue in more detail..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
