import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, FileText } from "lucide-react";
import { ReferenceInformationDialog } from "./ReferenceInformationDialog";
import { FloatingToolPanel } from "./FloatingToolPanel";
import {
  getExamReferenceDialogTitle,
  getExamReferencePdfUrl,
  subjectAllowsExamCalculator,
  subjectAllowsExamReferenceSheet,
} from "@/lib/examTools";

export type ExamToolbarVariant = "default" | "apclassroom";

interface ExamToolbarProps {
  subjectId?: string;
  size?: "sm" | "md";
  variant?: ExamToolbarVariant;
  className?: string;
}

export function ExamToolbar({
  subjectId,
  size = "md",
  variant = "default",
  className = "",
}: ExamToolbarProps) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const showCalculator = subjectAllowsExamCalculator(subjectId);
  const showReference = subjectAllowsExamReferenceSheet(subjectId);

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnSize = "icon" as const;
  const btnClass =
    variant === "apclassroom"
      ? "text-white/90 hover:bg-white/10 hover:text-white"
      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100";

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {showCalculator && (
          <Button
            type="button"
            variant="ghost"
            size={btnSize}
            className={btnClass}
            title="Calculator"
            aria-label="Open calculator"
            onClick={() => setCalculatorOpen(true)}
          >
            <Calculator className={iconClass} />
          </Button>
        )}
        {showReference && (
          <Button
            type="button"
            variant="ghost"
            size={btnSize}
            className={btnClass}
            title="Reference sheet"
            aria-label="Open reference information"
            onClick={() => setReferenceOpen(true)}
          >
            <FileText className={iconClass} />
          </Button>
        )}
      </div>

      {showReference && (
        <ReferenceInformationDialog
          open={referenceOpen}
          onOpenChange={setReferenceOpen}
          pdfUrl={getExamReferencePdfUrl(subjectId)}
          title={getExamReferenceDialogTitle(subjectId)}
        />
      )}

      {showCalculator && (
        <FloatingToolPanel
          open={calculatorOpen}
          onOpenChange={setCalculatorOpen}
          title="Calculator"
          defaultWidth={640}
          defaultHeight={520}
          minWidth={320}
          minHeight={260}
        >
          <iframe
            src="https://www.desmos.com/calculator"
            className="h-full w-full border-0 bg-slate-100"
            title="Desmos Calculator"
          />
        </FloatingToolPanel>
      )}
    </>
  );
}
