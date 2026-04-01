import { CANONICAL_SUBJECTS } from "./ap-subjects";

/**
 * Student-friendly display names for AP subjects, used across the site
 * (admin insights, admin library, subject selectors, etc.).
 */
export const SUBJECT_DISPLAY_NAMES: Record<string, string> = CANONICAL_SUBJECTS.reduce(
  (acc, subj) => {
    acc[subj.code] = subj.displayName;
    return acc;
  },
  {} as Record<string, string>,
);

/** Commonly-used short names for breadcrumbs and compact UI. */
export const SUBJECT_SHORT_NAMES: Record<string, string> = CANONICAL_SUBJECTS.reduce(
  (acc, subj) => {
    acc[subj.code] = subj.shortName;
    return acc;
  },
  {} as Record<string, string>,
);

export function getSubjectShortName(subjectCode: string): string {
  const code = subjectCode?.toUpperCase?.() ?? subjectCode;
  return SUBJECT_SHORT_NAMES[code] ?? subjectCode ?? "AP Course";
}

export function getSubjectDisplayName(subjectCode: string): string {
  const code = subjectCode?.toUpperCase?.() ?? subjectCode;
  return SUBJECT_DISPLAY_NAMES[code] ?? subjectCode ?? "—";
}
