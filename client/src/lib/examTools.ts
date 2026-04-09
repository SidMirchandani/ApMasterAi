import { getApiCodeForSubject, getSubjectByCode, getSubjectByLegacyId } from "@/subjects";
import { AP_BIOLOGY_REFERENCE_PDF_PATH } from "@/lib/apBioReference";

/** Subjects where the in-app Desmos calculator is offered (legacy route id or API code resolves via getApiCodeForSubject). */
const CALCULATOR_SUBJECT_CODES = new Set([
  "APBIO",
  "APCALCAB",
  "APCALCBC",
  "APCHEM",
  "APMACRO",
  "APMICRO",
  "APPHYS1",
  "APPHYS2",
  "APSTATS",
]);

/** Subjects where a reference sheet control is shown. PDF is shared until per-course sheets are added. */
const REFERENCE_SHEET_SUBJECT_CODES = new Set([
  "APBIO",
  "APCHEM",
  "APCSA",
  "APCSP",
  "APPHYS1",
  "APPHYS2",
  "APSTATS",
]);

export function subjectAllowsExamCalculator(subjectIdOrCode?: string): boolean {
  if (!subjectIdOrCode) return false;
  const code = getApiCodeForSubject(subjectIdOrCode);
  return code ? CALCULATOR_SUBJECT_CODES.has(code) : false;
}

export function subjectAllowsExamReferenceSheet(subjectIdOrCode?: string): boolean {
  if (!subjectIdOrCode) return false;
  const code = getApiCodeForSubject(subjectIdOrCode);
  return code ? REFERENCE_SHEET_SUBJECT_CODES.has(code) : false;
}

/** Same PDF as AP Biology for all subjects permitted to use a reference sheet (placeholder until course-specific PDFs exist). */
export function getExamReferencePdfUrl(): string {
  return AP_BIOLOGY_REFERENCE_PDF_PATH;
}

export function getExamReferenceDialogTitle(subjectIdOrCode?: string): string {
  const subject = subjectIdOrCode
    ? getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode)
    : undefined;
  const name = subject?.displayName ?? "AP Exam";
  return `${name} — Reference information`;
}

export function showPracticeExamToolHeader(subjectIdOrCode?: string): boolean {
  return (
    subjectAllowsExamCalculator(subjectIdOrCode) ||
    subjectAllowsExamReferenceSheet(subjectIdOrCode)
  );
}
