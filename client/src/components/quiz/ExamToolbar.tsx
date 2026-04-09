import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, FileText } from "lucide-react";
import { ReferenceInformationDialog } from "./ReferenceInformationDialog";
import { FloatingToolPanel } from "./FloatingToolPanel";
import {
  getApBiologyReferencePdfUrl,
  isApBiologySubject,
} from "@/lib/apBioReference";

const CALCULATOR_LEGACY_IDS = [
  "calculus-ab",
  "calculus-bc",
  "statistics",
  "chemistry",
  "physics-1",
  "physics-2",
];

function subjectAllowsDesmosCalculator(subjectId?: string): boolean {
  if (!subjectId) return false;
  if (isApBiologySubject(subjectId)) return true;
  return CALCULATOR_LEGACY_IDS.includes(subjectId);
}

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

  const apBio = isApBiologySubject(subjectId);
  const showCalculator = subjectAllowsDesmosCalculator(subjectId);

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
        {apBio && (
          <Button
            type="button"
            variant="ghost"
            size={btnSize}
            className={btnClass}
            title="Reference sheet"
            aria-label="Open AP Biology equations and formulas"
            onClick={() => setReferenceOpen(true)}
          >
            <FileText className={iconClass} />
          </Button>
        )}
      </div>

      <ReferenceInformationDialog
        open={referenceOpen}
        onOpenChange={setReferenceOpen}
        pdfUrl={getApBiologyReferencePdfUrl()}
        title="AP Biology — Equations and Formulas"
      />

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
    </>
  );
}
