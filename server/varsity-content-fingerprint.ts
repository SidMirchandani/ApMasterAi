import crypto from "crypto";

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

/** Lowercase, strip HTML, remove all whitespace, strip leading enumerators. */
export function normalizeForFingerprint(part: string): string {
  let s = stripHtml(part);
  s = s.toLowerCase().replace(/\s+/g, "");
  s = s.replace(/^q\d+:?\s*/i, "");
  s = s.replace(/^\d+\.\s*/, "");
  return s;
}

/** First text blocks before any image: passage + question stem (Varsity import order). */
export function passageAndQuestionFromPromptBlocks(
  blocks: { type: string; value?: string; url?: string }[],
): { passage: string; question: string; graphicUrl: string | null } {
  const texts: string[] = [];
  let graphicUrl: string | null = null;
  for (const b of blocks) {
    if (b.type === "text" && b.value) texts.push(b.value);
    else if (b.type === "image" && b.url) {
      graphicUrl = b.url;
      break;
    }
  }
  if (texts.length >= 2) {
    return { passage: texts[0], question: texts.slice(1).join("\n"), graphicUrl };
  }
  if (texts.length === 1) {
    return { passage: "", question: texts[0], graphicUrl };
  }
  return { passage: "", question: "", graphicUrl };
}

export function computeVarsityFingerprint(
  passageText: string,
  questionText: string,
  graphicUrl?: string | null,
): string {
  const p = normalizeForFingerprint(passageText || "");
  const q = normalizeForFingerprint(questionText || "");
  const g = graphicUrl && graphicUrl !== "$undefined" ? normalizeForFingerprint(graphicUrl) : "";
  const payload = `${p}\0${q}\0${g}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}
