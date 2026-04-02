import { stripHtml } from "./varsity-content-fingerprint";

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function truncateChoice(text: string, max = 160): string {
  const t = collapseWhitespace(stripHtml(text));
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "…";
}

/**
 * Map Varsity HTML/plain explanation into the same section headings used by Gemini
 * in processQuestions.ts. Omits optional sections when there is nothing to put in them.
 */
export function formatVarsityExplanationApStyle(
  rawExplanation: string,
  correctLabel: string,
  correctChoiceText: string,
  conceptHint?: string | null,
): string {
  if (!rawExplanation || rawExplanation === "$undefined") return "";

  let body = collapseWhitespace(stripHtml(rawExplanation));
  if (!body) return "";

  // Drop redundant leading headings if Varsity already used our pattern
  body = body.replace(/^\*\*concept:\*\*\s*/i, "").trim();
  body = body.replace(/^\*\*why\s+[a-e]\s+is\s+correct:\*\*\s*/i, "").trim();

  const choiceRef = truncateChoice(correctChoiceText || "");
  const whyBody = choiceRef
    ? `Choice ${correctLabel} (${choiceRef}) is correct. ${body}`
    : `Choice ${correctLabel} is correct. ${body}`;

  const sections: string[] = [];

  const hint = conceptHint ? collapseWhitespace(stripHtml(conceptHint)) : "";
  if (hint.length >= 8) {
    sections.push(`**Concept:** This question draws on ${hint}.`);
  }

  sections.push(`**Why ${correctLabel} is correct:** ${whyBody}`);

  return sections.join("\n\n");
}
