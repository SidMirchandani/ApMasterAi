/**
 * Parses explanation text into structured sections: Concept, Why [X] is correct, Why other choices are wrong.
 * Handles both bold markdown (**Section**:) and plain (Section:) headers.
 */

export interface ParsedExplanation {
  concept: string | null;
  whyCorrect: string | null;
  correctLetter: string | null; // "A" | "B" | "C" | "D" | "E"
  whyOthersWrong: string | null;
  whyOthersAlreadyList: boolean;
}

const TRIM = (s: string) => s.replace(/\n+$/, "").replace(/^\n+/, "").trim();

const SECTION_PATTERNS = {
  concept: /^\s*\*{0,2}\s*Concept\s*\*{0,2}\s*:\s*/im,
  whyCorrect: /^\s*\*{0,2}\s*Why\s+([A-E])\s+is\s+correct\s*\*{0,2}\s*:\s*/im,
  whyOthers: /^\s*\*{0,2}\s*Why\s+other\s+choices\s+are\s+wrong\s*\*{0,2}\s*:\s*/im,
};

function looksLikeList(text: string): boolean {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return false;
  const bulletStart = /^(\s*[-*•]\s+|\s*\d+\.\s+)/;
  const letterStart = /^([A-E][.)]\s+)/;
  const withBullet = lines.filter((l) => bulletStart.test(l) || letterStart.test(l)).length;
  return withBullet >= 2 || (lines.length >= 2 && withBullet >= 1);
}

/** Split "why others wrong" into bullet items. Preserves existing list or splits by sentence. */
export function getWhyOthersWrongBullets(raw: string): string[] {
  const t = TRIM(raw);
  if (!t) return [];

  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);

  if (looksLikeList(t)) {
    return lines.map((line) => {
      const stripped = line
        .replace(/^\s*[-*•]\s+/, "")
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/^([A-E])[.)]\s+/, "$1. ");
      return stripped.trim();
    });
  }

  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length >= 2) return sentences;

  return [t];
}

/**
 * Parse explanation into Concept, Why [X] is correct, and Why other choices are wrong.
 * Returns null if the text doesn't match the expected structure.
 */
export function parseExplanationSections(explanation: string): ParsedExplanation | null {
  const raw = String(explanation).trim();
  if (!raw) return null;

  let concept: string | null = null;
  let whyCorrect: string | null = null;
  let correctLetter: string | null = null;
  let whyOthersWrong: string | null = null;

  const conceptMatch = raw.match(SECTION_PATTERNS.concept);
  const whyCorrectMatch = raw.match(SECTION_PATTERNS.whyCorrect);
  const whyOthersMatch = raw.match(SECTION_PATTERNS.whyOthers);

  const indices: { name: string; index: number; endOfHeader: number; letter?: string }[] = [];
  if (conceptMatch && conceptMatch.index !== undefined)
    indices.push({
      name: "concept",
      index: conceptMatch.index,
      endOfHeader: conceptMatch.index + conceptMatch[0].length,
    });
  if (whyCorrectMatch && whyCorrectMatch.index !== undefined)
    indices.push({
      name: "whyCorrect",
      index: whyCorrectMatch.index,
      endOfHeader: whyCorrectMatch.index + whyCorrectMatch[0].length,
      letter: whyCorrectMatch[1],
    });
  if (whyOthersMatch && whyOthersMatch.index !== undefined)
    indices.push({
      name: "whyOthers",
      index: whyOthersMatch.index,
      endOfHeader: whyOthersMatch.index + whyOthersMatch[0].length,
    });

  indices.sort((a, b) => a.index - b.index);

  for (let i = 0; i < indices.length; i++) {
    const curr = indices[i];
    const next = indices[i + 1];
    const start = curr.endOfHeader;
    const end = next ? next.index : raw.length;
    const content = TRIM(raw.slice(start, end));

    if (curr.name === "concept") concept = content || null;
    else if (curr.name === "whyCorrect") {
      whyCorrect = content || null;
      correctLetter = curr.letter ?? null;
    } else if (curr.name === "whyOthers") whyOthersWrong = content || null;
  }

  if (whyCorrect === null && whyOthersWrong === null) return null;

  return {
    concept,
    whyCorrect,
    correctLetter,
    whyOthersWrong,
    whyOthersAlreadyList: whyOthersWrong !== null ? looksLikeList(whyOthersWrong) : false,
  };
}
