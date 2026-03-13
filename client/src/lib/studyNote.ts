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
