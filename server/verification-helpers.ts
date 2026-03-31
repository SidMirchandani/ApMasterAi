import { flattenChoiceText, fetchImageAsBase64 } from "./explanation-helpers";
import { isQuotaError, callWithRetry } from "./study-notes-helpers";
import { getSubjectDisplayName } from "../lib/subject-display-names";

export { isQuotaError, callWithRetry };

/** Section codes per subject — keep in sync with Admin Library filters. */
export const SECTION_CODES_BY_SUBJECT: Record<string, string[]> = {
  APMACRO: ["BEC", "EI", "NI", "FS", "LR", "OT"],
  APMICRO: ["BEC", "SD", "PC", "IMP", "FM", "MF"],
  APCSP: ["CRD", "DAT", "AAP", "CSN", "IOC"],
  APCHEM: ["AMS", "MIP", "IMF", "CR", "KIN", "THE", "EQ", "AB", "ATD"],
  APGOV: ["FOP", "ILR", "CLR", "APB", "PPP"],
  APPSYCH: ["BIO", "COG", "DEV", "SOC", "MPH"],
  APBIO: ["CL", "CSF", "CE", "CCC", "HER", "GER", "NS", "ECO"],
  APCALCAB: ["LIM", "DDF", "DCI", "CAD", "AAD", "IAC", "DE", "AI"],
  APCALCBC: ["LIM", "DDF", "DCI", "CAD", "AAD", "IAC", "DE", "AI", "PPV", "ISS"],
  APCSA: ["U1", "U2", "U3", "U4"],
  APUSH: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"],
  APWH: ["GT", "NE", "LBE", "TI", "REV", "COI", "GC", "CWD", "GLO"],
  APEURO: ["RE", "AR", "AC", "SPP", "CRR", "IND", "NPP", "GCF", "CCE"],
  APLANG: ["CRE", "SS", "RS", "OC", "ARG"],
  APLIT: ["SF1", "PO1", "LF1", "SF2", "PO2", "LF2", "SF3", "PO3", "LF3"],
  APSTATS: ["EOV", "ETV", "CD", "PRD", "SD", "ICP", "IQM", "ICC", "IQS"],
  APPHYS1: ["KIN", "FTD", "WEP", "LMO", "TRD", "EMR", "OSC", "FLU"],
  APPHYS2: ["THD", "EFP", "EC", "MEI", "GPO", "WPO", "MOD"],
  APES: ["LWE", "LWB", "POP", "ESR", "LWU", "ERC", "APL", "ATP", "GCH"],
  APHUG: ["TG", "PMP", "CPP", "PPP", "ARL", "CUL", "IED"],
};

export type VerificationAiChecks = {
  questionSound: boolean;
  choicesSound: boolean;
  answerKeyMatchesContent: boolean;
  explanationSupportsAnswer: boolean;
  sectionPlausible: boolean;
};

export type VerificationAiResult = {
  status: "pass" | "needs_review" | "fail";
  confidence: "high" | "medium" | "low";
  checks: VerificationAiChecks;
  issues: string[];
};

function isPlausibleHttpUrl(url: string): boolean {
  const u = url.trim();
  return u.startsWith("http://") || u.startsWith("https://");
}

function looksLikeBareFilename(url: string): boolean {
  const u = url.trim();
  if (!u || u.includes("://")) return false;
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(u) || /^[\w\-./\\]+\.(png|jpg|jpeg|gif|webp)$/i.test(u);
}

export function collectImageUrlsFromBlocks(blocks: any[] | undefined): string[] {
  if (!blocks || !Array.isArray(blocks)) return [];
  const out: string[] = [];
  for (const b of blocks) {
    if (b?.type === "image" && typeof b.url === "string" && b.url.trim()) {
      out.push(b.url.trim());
    }
  }
  return out;
}

export function collectAllImageUrls(question: any): string[] {
  const set = new Set<string>();
  collectImageUrlsFromBlocks(question.prompt_blocks).forEach((u) => set.add(u));
  const choices = question.choices;
  if (choices && typeof choices === "object" && !Array.isArray(choices)) {
    for (const letter of ["A", "B", "C", "D", "E"]) {
      collectImageUrlsFromBlocks(choices[letter]).forEach((u) => set.add(u));
    }
  }
  const legacy = question.image_urls;
  if (legacy && typeof legacy === "object") {
    for (const key of ["question", "A", "B", "C", "D", "E"]) {
      const arr = legacy[key];
      if (Array.isArray(arr)) {
        for (const u of arr) {
          if (typeof u === "string" && u.trim()) set.add(u.trim());
        }
      }
    }
  }
  return Array.from(set);
}

function stemText(question: any): string {
  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    return flattenChoiceText(question.prompt_blocks).trim();
  }
  return (typeof question.prompt === "string" ? question.prompt : "").trim();
}

function choiceHasContent(question: any, letter: string): boolean {
  const text =
    question.choices && typeof question.choices === "object" && !Array.isArray(question.choices)
      ? flattenChoiceText(question.choices[letter] || []).trim()
      : "";
  const imgs = question.choices?.[letter] ? collectImageUrlsFromBlocks(question.choices[letter]) : [];
  const legacy = question.image_urls?.[letter];
  const legacyUrls = Array.isArray(legacy) ? legacy.filter((x: unknown) => typeof x === "string") : [];
  return text.length > 0 || imgs.length > 0 || legacyUrls.length > 0;
}

export type LintResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function lintQuestion(question: any): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const subject = typeof question.subject_code === "string" ? question.subject_code.trim() : "";
  if (!subject) errors.push("Missing subject_code");

  const section = typeof question.section_code === "string" ? question.section_code.trim() : "";
  if (!section) {
    errors.push("Missing section_code");
  } else if (subject && SECTION_CODES_BY_SUBJECT[subject]) {
    if (!SECTION_CODES_BY_SUBJECT[subject].includes(section)) {
      errors.push(`section_code "${section}" is not in allowed list for ${subject}`);
    }
  }

  const ai = question.answerIndex;
  if (typeof ai !== "number" || !Number.isInteger(ai) || ai < 0 || ai > 4) {
    errors.push(`answerIndex must be integer 0–4, got ${ai}`);
  }

  const stemT = stemText(question);
  const stemImages = [
    ...collectImageUrlsFromBlocks(question.prompt_blocks),
    ...(Array.isArray(question.image_urls?.question) ? question.image_urls.question : []),
  ].filter((u) => typeof u === "string");

  if (!stemT && stemImages.length === 0) {
    errors.push("Stem has no text and no images");
  }

  const letters = ["A", "B", "C", "D", "E"] as const;
  for (const L of letters) {
    if (!choiceHasContent(question, L)) {
      if (L === "E") continue;
      errors.push(`Choice ${L} appears empty (no text or images)`);
    }
  }

  if (typeof ai === "number" && ai === 4 && !choiceHasContent(question, "E")) {
    errors.push("answerIndex is E (4) but choice E is empty");
  }

  const expl = typeof question.explanation === "string" ? question.explanation.trim() : "";
  if (!expl) warnings.push("Explanation is empty");

  for (const url of collectAllImageUrls(question)) {
    if (looksLikeBareFilename(url)) {
      errors.push(`Image URL looks like a bare filename (not uploaded): ${url.slice(0, 80)}`);
    } else if (!isPlausibleHttpUrl(url)) {
      errors.push(`Image URL is not http(s): ${url.slice(0, 80)}`);
    }
  }

  const ok = errors.length === 0;
  return { ok, errors, warnings };
}

export async function verifyImageUrlsReachable(
  urls: string[],
  timeoutMs: number = 8000,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const url of urls) {
    if (!isPlausibleHttpUrl(url) || looksLikeBareFilename(url)) continue;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
      clearTimeout(t);
      if (!res.ok) {
        errors.push(`Image not reachable (${res.status}): ${url.slice(0, 100)}`);
      }
    } catch {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { method: "GET", signal: ctrl.signal, redirect: "follow" });
        clearTimeout(t);
        if (!res.ok) errors.push(`Image not reachable (${res.status}): ${url.slice(0, 100)}`);
      } catch {
        errors.push(`Image fetch failed: ${url.slice(0, 100)}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export async function buildVerificationPromptParts(question: any): Promise<{ promptParts: any[] }> {
  const subjectCode = question.subject_code || "";
  const subjectName = subjectCode ? getSubjectDisplayName(subjectCode) : "Unknown subject";
  const sectionCode = question.section_code || "";
  const correctLabel = String.fromCharCode(65 + (question.answerIndex ?? 0));
  const explanation = typeof question.explanation === "string" ? question.explanation.trim() : "";

  const promptParts: any[] = [];

  const header =
    `You are an expert AP exam reviewer. Verify this multiple-choice question for quality and internal consistency.\n` +
    `Subject: ${subjectName} (${subjectCode})\n` +
    `Listed unit/section code: ${sectionCode}\n` +
    `Marked correct answer: ${correctLabel}\n\n`;

  promptParts.push({ text: header });

  if (question.prompt_blocks && Array.isArray(question.prompt_blocks)) {
    const qtext = flattenChoiceText(question.prompt_blocks);
    promptParts.push({ text: `Question stem (text):\n${qtext || "(no text)"}\n\n` });
    for (const block of question.prompt_blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          promptParts.push({
            inlineData: { mimeType: "image/png", data: base64Data },
          });
        } catch (err) {
          console.error(`Verification: failed stem image ${block.url}:`, err);
        }
      }
    }
  } else if (question.prompt) {
    promptParts.push({ text: `Question stem:\n${question.prompt}\n\n` });
  }

  let choicesText = `Answer choices:\n`;
  const choices = question.choices ?? {};
  for (const letter of ["A", "B", "C", "D", "E"]) {
    const blocks = choices[letter];
    const t = flattenChoiceText(Array.isArray(blocks) ? blocks : []);
    choicesText += `${letter}. ${t || "(no text)"}\n`;
  }
  promptParts.push({ text: choicesText });

  for (const letter of ["A", "B", "C", "D", "E"]) {
    const blocks = choices[letter];
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      if (block.type === "image" && block.url) {
        try {
          const base64Data = await fetchImageAsBase64(block.url);
          promptParts.push({
            inlineData: { mimeType: "image/png", data: base64Data },
          });
        } catch (errLetter) {
          console.error(`Verification: failed choice ${letter} image:`, errLetter);
        }
      }
    }
  }

  if (question.image_urls && typeof question.image_urls === "object") {
    promptParts.push({
      text: `\n(Legacy image URLs also present in metadata; prefer inline images above when shown.)\n`,
    });
  }

  promptParts.push({
    text:
      `Explanation shown to students:\n${explanation || "(none)"}\n\n` +
      `Return ONLY valid JSON (no markdown, no code fences) with exactly these keys:\n` +
      `{"status":"pass"|"needs_review"|"fail","confidence":"high"|"medium"|"low",` +
      `"checks":{"questionSound":true|false,"choicesSound":true|false,"answerKeyMatchesContent":true|false,"explanationSupportsAnswer":true|false,"sectionPlausible":true|false},` +
      `"issues":["string",...]}\n\n` +
      `Guidelines:\n` +
      `- status "pass": no material problems; content fits subject; keyed answer is correct; explanation supports the key.\n` +
      `- "needs_review": uncertain, minor wording, or explanation thin but probably OK.\n` +
      `- "fail": broken question, wrong key, explanation contradicts key, choices don't match stem, wrong unit.\n` +
      `- issues: short bullet strings; empty array if none.\n` +
      `JSON:`,
  });

  return { promptParts };
}

export function parseVerificationJson(raw: string): VerificationAiResult | null {
  try {
    const trimmed = raw.trim();
    const jsonStr =
      trimmed.replace(/^[^{\[]*/, "").replace(/[^}\]]*$/, "").trim() || trimmed;
    const parsed = JSON.parse(jsonStr) as any;
    const status = parsed?.status;
    if (status !== "pass" && status !== "needs_review" && status !== "fail") return null;
    const confidence = parsed?.confidence;
    if (confidence !== "high" && confidence !== "medium" && confidence !== "low") return null;
    const c = parsed?.checks || {};
    const checks: VerificationAiChecks = {
      questionSound: !!c.questionSound,
      choicesSound: !!c.choicesSound,
      answerKeyMatchesContent: !!c.answerKeyMatchesContent,
      explanationSupportsAnswer: !!c.explanationSupportsAnswer,
      sectionPlausible: !!c.sectionPlausible,
    };
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((x: any) => typeof x === "string").map((x: string) => x.trim().slice(0, 500))
      : [];
    return { status, confidence, checks, issues };
  } catch {
    return null;
  }
}
