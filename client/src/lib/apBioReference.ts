import { getApiCodeForSubject } from "@/subjects";

/** Public URL for the official-style AP Biology equations & formulas sheet (served from `/public/reference`). */
export const AP_BIOLOGY_REFERENCE_PDF_PATH = "/reference/ap-biology-equations-and-formulas-sheet.pdf";

export function isApBiologySubject(subjectIdOrCode: string | undefined): boolean {
  if (!subjectIdOrCode) return false;
  return getApiCodeForSubject(subjectIdOrCode) === "APBIO";
}

export function getApBiologyReferencePdfUrl(): string {
  return AP_BIOLOGY_REFERENCE_PDF_PATH;
}
