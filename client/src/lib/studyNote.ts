/** Minimum non-empty study notes required to show the primer screen. */
export const MIN_PRIMER_NOTES = 2;

/**
 * Extracts study note text from a question: prefers test_slug, else study_note tag.
 * Tolerates missing or non-array tags.
 */
export function getStudyNoteFromQuestion(q: { tags?: unknown; test_slug?: string | null }): string {
  const fromSlug = (q.test_slug ?? "").trim();
  if (fromSlug) return fromSlug;
  const tags = Array.isArray(q.tags) ? q.tags : [];
  const tag = tags.find(
    (t): t is string => typeof t === "string" && t.startsWith("study_note:")
  );
  return tag ? String(tag).replace(/^study_note:\s*/, "").trim() : "";
}

export function getPrimerNoteItems(
  questions: { tags?: unknown; test_slug?: string | null }[],
): { index: number; note: string }[] {
  return questions
    .map((q, index) => ({ index, note: getStudyNoteFromQuestion(q) }))
    .filter((item) => item.note.length > 0);
}

export function shouldShowStudyNotesPrimer(
  questions: { tags?: unknown; test_slug?: string | null }[],
  minNotes: number = MIN_PRIMER_NOTES,
): boolean {
  return getPrimerNoteItems(questions).length >= minNotes;
}
