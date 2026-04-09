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

/** Subjects where a reference sheet control is shown. */
const REFERENCE_SHEET_SUBJECT_CODES = new Set([
  "APBIO",
  "APCHEM",
  "APCSA",
  "APCSP",
  "APPHYS1",
  "APPHYS2",
  "APSTATS",
]);

/** Public URLs under `/public/reference`. */
const REFERENCE_PDF_BY_SUBJECT_CODE: Record<string, string> = {
  APBIO: AP_BIOLOGY_REFERENCE_PDF_PATH,
  APCHEM: "/reference/ap-chemistry-equations-sheet.pdf",
  APCSA: "/reference/ap-computer-science-a-java-quick-reference.pdf",
  APCSP: "/reference/ap-computer-science-principles-exam-reference-sheet.pdf",
  APPHYS1: "/reference/ap-physics-1-equations-sheet.pdf",
  APPHYS2: "/reference/ap-physics-2-equations-sheet.pdf",
  APSTATS: "/reference/ap-statistics-formula-tables-sheet.pdf",
};

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

/** Reference PDF for this subject, or biology sheet as fallback. */
export function getExamReferencePdfUrl(subjectIdOrCode?: string): string {
  const code = subjectIdOrCode ? getApiCodeForSubject(subjectIdOrCode) : undefined;
  if (code && REFERENCE_PDF_BY_SUBJECT_CODE[code]) {
    return REFERENCE_PDF_BY_SUBJECT_CODE[code];
  }
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
