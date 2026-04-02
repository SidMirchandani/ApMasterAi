import * as cheerio from "cheerio";
import {
  getVarsitySubjectConfig,
  getVarsitySlugsFromPracticeUrl,
  VARSITY_ORIGIN,
} from "../varsity-subjects";
import { getSubjectConfig } from "../subjects-helper";

export type Block = { type: "text"; value: string } | { type: "image"; url: string };

export interface VarsityQuestion {
  subject_code: string;
  question_id: number;
  section_code: string;
  prompt_blocks: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  correct_answer: string | null;
  explanation?: string;
  /** Varsity topic or last breadcrumb — for explanation Concept line */
  concept_hint?: string | null;
}

export interface VarsityScrapeResult {
  questions: VarsityQuestion[];
  linksCrawled: number;
  rawQuestionsFound: number;
}

const USER_AGENT = "Mozilla/5.0 (compatible; APMaster/1.0)";

const MAX_CRAWL_URLS = 220;
// Keep individual HTTP requests short so we don't appear frozen when Varsity is slow.
const FETCH_TIMEOUT_MS = 8000;
const DIAGNOSTIC_PROBE_MAX = 14;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function shouldCrawlUrl(href: string, pathSlug: string, underscoreSlug: string): boolean {
  let p: string;
  try {
    p = new URL(href).pathname.toLowerCase();
  } catch {
    return false;
  }
  const slugPath = `/practice/subjects/${pathSlug.toLowerCase()}/`;
  // Only allow pages under /practice/subjects/{slug}/... (including /help/...).
  if (p.startsWith(slugPath)) return true;
  return false;
}

function shouldCrawlHelpTopicPath(pathname: string, pathSlug: string): boolean {
  const p = pathname.toLowerCase();
  const base = `/practice/subjects/${pathSlug.toLowerCase()}/help`;
  if (p === base) return true;
  if (p.startsWith(base + "/")) return true;
  return false;
}

function normalizeQueueUrl(href: string, base?: string): string | null {
  try {
    const u = new URL(href, base || VARSITY_ORIGIN);
    if (!u.hostname.toLowerCase().endsWith("varsitytutors.com")) return null;
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/") && u.pathname.length > 1) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

function extractConceptPath($: cheerio.CheerioAPI): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    const n = normalizeText(t);
    if (n.length < 2 || /^home$/i.test(n)) return;
    const k = n.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(n);
  };

  $(
    '[aria-label="breadcrumb"] a, [aria-label="Breadcrumb"] a, nav.breadcrumb a, ol.breadcrumb a, .breadcrumb a, [class*="Breadcrumb"] a',
  ).each((_, el) => {
    push($(el).text());
  });

  if (out.length) return out;

  $("script[type=\"application/ld+json\"]").each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const o = node as Record<string, unknown>;
        const graph = (o["@graph"] as unknown[]) || [node];
        for (const g of graph) {
          const gg = g as Record<string, unknown>;
          if (gg["@type"] !== "BreadcrumbList") continue;
          const list = gg.itemListElement as unknown[] | undefined;
          if (!Array.isArray(list)) continue;
          for (const it of list) {
            const item = it as Record<string, unknown>;
            const name = item.name ?? (item.item as Record<string, unknown>)?.name;
            if (typeof name === "string") push(name);
          }
        }
      }
    } catch {
      /* ignore */
    }
  });

  return out;
}

function buildCorpusForSection(
  conceptPath: string[],
  topicName: string | null,
  pageTitle: string,
  linkTitle: string,
  promptBlocks: Block[],
  choices: Record<string, Block[]>,
): string {
  const tail = conceptPath.slice(-4);
  const weighted = [
    ...conceptPath.slice(0, Math.max(0, conceptPath.length - 4)),
    ...tail.flatMap((s) => [s, s, s]),
  ];

  let text = "";
  text += " " + weighted.join(" ").toLowerCase();
  if (topicName) text += " " + topicName.toLowerCase();
  if (pageTitle) text += " " + pageTitle.toLowerCase();
  if (linkTitle) text += " " + linkTitle.toLowerCase();

  for (const blk of promptBlocks) {
    if (blk.type === "text") text += " " + blk.value.toLowerCase();
  }
  for (const key of Object.keys(choices)) {
    for (const blk of choices[key] || []) {
      if (blk.type === "text") text += " " + blk.value.toLowerCase();
    }
  }
  return text;
}

function assignSectionFromConceptContext(
  subjectCode: string,
  opts: {
    conceptPath: string[];
    topicName: string | null;
    pageTitle: string;
    linkTitle: string;
    promptBlocks: Block[];
    choices: Record<string, Block[]>;
  },
): string {
  const subjectConfig = getSubjectConfig(subjectCode);
  if (!subjectConfig) return "";

  const corpus = buildCorpusForSection(
    opts.conceptPath,
    opts.topicName,
    opts.pageTitle,
    opts.linkTitle,
    opts.promptBlocks,
    opts.choices,
  );

  const sectionKeywords = subjectConfig.sectionKeywords || {};
  const unitIds = Object.keys(sectionKeywords);
  if (unitIds.length === 0) return "";

  const scores: Record<string, number> = {};
  for (const id of unitIds) scores[id] = 0;

  if (subjectConfig.units && subjectConfig.units.length > 0) {
    for (const u of subjectConfig.units) {
      const titleNorm = u.title.toLowerCase();
      if (titleNorm.length >= 4 && corpus.includes(titleNorm)) {
        scores[u.id] = (scores[u.id] || 0) + 8;
      }
      const words = titleNorm.split(/\s+/).filter((w) => w.length > 3);
      let wordHits = 0;
      for (const w of words) {
        if (corpus.includes(w)) wordHits++;
      }
      if (words.length > 0) {
        scores[u.id] = (scores[u.id] || 0) + wordHits * 2;
      }
    }
  }

  for (const code of unitIds) {
    for (const kw of sectionKeywords[code] || []) {
      if (corpus.includes(kw.toLowerCase())) scores[code]++;
    }
  }

  let bestCode = unitIds[0];
  let bestScore = 0;
  for (const code of unitIds) {
    if (scores[code] > bestScore) {
      bestScore = scores[code];
      bestCode = code;
    }
  }
  return bestCode;
}

interface RawVarsityAnswer {
  text: string;
  isCorrect: boolean;
}

interface RawVarsityQuestion {
  question: string;
  passage?: string | null;
  answers: RawVarsityAnswer[];
  explanation?: string;
  topicName?: string | null;
  graphic_url?: string | null;
}

/**
 * Next.js flight chunks use rows like `20:T452,<payload>` where `452` is a **hexadecimal** byte/char
 * length; explanations in embedded JSON reference `$20` and must be resolved from this table.
 */
function extractNextFlightStringTable(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(^|[^0-9a-fA-F])([0-9a-fA-F]+):T([0-9a-fA-F]+),/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[2].toLowerCase();
    const len = parseInt(m[3], 16);
    if (!Number.isFinite(len) || len < 0 || len > 2_000_000) continue;
    const start = m.index + m[0].length;
    const text = html.slice(start, start + len);
    if (text.length === len) map.set(id, text);
  }
  return map;
}

function resolveFlightExplanationRef(raw: string | undefined, table: Map<string, string>): string {
  if (!raw || raw === "$undefined") return "";
  const t = raw.trim();
  if (!/^\$[0-9a-fA-F]+$/i.test(t)) return raw;
  const id = t.slice(1).toLowerCase();
  return table.get(id) ?? raw;
}

/**
 * Learn-by-Concept help pages embed `questions` in RSC flight data, followed by `subject` (not standardizedTestConfig).
 */
/**
 * Extract the `questions` array by scanning from the `"questions":` marker and
 * matching brackets while respecting strings and escapes. This is slower than
 * a simple regex end marker but much more robust against changes in what comes
 * after the array (e.g. `subject`, `standardizedTestConfig`, etc.).
 */
function extractQuestionsArraySliceBracketed(html: string): string | null {
  const markers = ['"questions":'];
  for (const marker of markers) {
    let from = 0;
    while (from < html.length) {
      const idx = html.indexOf(marker, from);
      if (idx === -1) break;
      let i = idx + marker.length;
      while (i < html.length && /\s/.test(html[i])) i++;
      if (html[i] !== "[") {
        from = idx + 1;
        continue;
      }
      const arrStart = i;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let j = arrStart; j < html.length; j++) {
        const c = html[j];
        if (inString) {
          if (escape) {
            escape = false;
            continue;
          }
          if (c === "\\") {
            escape = true;
            continue;
          }
          if (c === '"') {
            inString = false;
            continue;
          }
          continue;
        }
        if (c === '"') {
          inString = true;
          continue;
        }
        if (c === "[") depth++;
        else if (c === "]") {
          depth--;
          if (depth === 0) return html.slice(arrStart, j + 1);
        }
      }
      from = idx + 1;
    }
  }
  return null;
}

function extractQuestionsArraySlice(html: string): string | null {
  return extractQuestionsArraySliceBracketed(html);
}

function jsonParseQuestionsSlice(slice: string): RawVarsityQuestion[] {
  // First try parsing the slice as-is. Most modern pages embed a valid JSON array already.
  try {
    const direct = JSON.parse(slice) as unknown;
    if (Array.isArray(direct)) return direct as RawVarsityQuestion[];
  } catch {
    // fall through to escaped-flight handling
  }

  let s = slice;

  // If this looks like an escaped RSC blob (\" and \\ all over), unescape in a controlled way.
  if (s.includes('\\"') || s.includes("\\\\")) {
    s = s.replace(/\\\\/g, "\\");
    s = s.replace(/\\"/g, '"');
  }

  // At this point we only care about getting a valid array back; we are OK
  // with losing exotic backslash formatting inside strings. Strip any remaining
  // backslashes that could cause JSON to be invalid.
  s = s.replace(/\\/g, "");

  const parsed = JSON.parse(s) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as RawVarsityQuestion[];
}

function extractQuestionsFromNextPayload(html: string, pageUrl?: string): RawVarsityQuestion[] {
  const flightTable = extractNextFlightStringTable(html);
  let slice: string | null = null;

  slice = extractQuestionsArraySlice(html);

  if (!slice) {
    const idx = html.indexOf('"questions"');
    const idxEsc = html.indexOf('\\"questions\\"');
    if (idx === -1 && idxEsc === -1) {
      let shouldWarn = true;
      if (pageUrl) {
        try {
          const u = new URL(pageUrl);
          const p = u.pathname.toLowerCase();
          if (!p.includes("/help/")) {
            shouldWarn = false;
          }
        } catch {
          // ignore URL parse issues and keep default behaviour
        }
      }
      if (shouldWarn) {
        console.warn(
          "[VarsityScraper] No questions marker in HTML (help/practice page format unknown).",
          { pageUrl: pageUrl || "" },
        );
      }
    }
    return [];
  }

  try {
    const parsed = jsonParseQuestionsSlice(slice);
    for (const q of parsed) {
      if (q.explanation) {
        q.explanation = resolveFlightExplanationRef(q.explanation, flightTable);
      }
    }
    return parsed;
  } catch (err) {
    console.warn("[VarsityScraper] Failed to parse questions payload", err, {
      sample: slice.slice(0, 500),
    });
    return [];
  }
}

/**
 * Fallback for AP Bio Learn-by-Concept help pages: the visible HTML already contains
 * the full questions, choices, and explanations. This is much more stable than
 * reverse-engineering Next.js flight JSON for these pages.
 */
function extractHelpQuestionsFromHtml(html: string): RawVarsityQuestion[] {
  const $ = cheerio.load(html);
  const out: RawVarsityQuestion[] = [];

  // Main Help Questions card
  const card = $("div.bg-white.rounded-2xl").first();
  if (!card.length) return out;

  card.find("div.border-b.border-slate-200").each((_, el) => {
    const root = $(el);

    const stemProse = root.find("div.prose").first();

    const stemParts: string[] = [];
    if (stemProse.length) {
      stemProse.find("p").each((_, p) => {
        const t = $(p).text().trim();
        if (!t) return;
        const last = stemParts[stemParts.length - 1] || "";
        if (t === last) return;
        stemParts.push(t);
      });

      const codeBlocks: string[] = [];
      stemProse.find("pre, code").each((_, codeEl) => {
        const t = $(codeEl).text();
        // Normalize whitespace so code is compact and doesn't have large vertical gaps:
        // - strip trailing spaces
        // - collapse 3+ blank lines down to one
        // - trim leading/trailing blank lines
        // - remove standalone blank lines entirely (no internal empty lines)
        const withoutTrailingSpaces = t.replace(/[ \t]+$/gm, "");
        const collapsedBlankLines = withoutTrailingSpaces.replace(/\n{3,}/g, "\n\n");
        const trimmedEdges = collapsedBlankLines.replace(/^\s*\n/, "").replace(/\n\s*$/, "");
        const lines = trimmedEdges.split(/\r?\n/);
        const compactLines = lines.filter((line) => line.trim().length > 0);
        const finalText = compactLines.join("\n").trimEnd();
        if (!finalText) return;
        const last = codeBlocks[codeBlocks.length - 1] || "";
        if (finalText === last) return;
        codeBlocks.push(finalText);
      });

      if (codeBlocks.length) {
        const combined = codeBlocks.join("\n\n");
        const fenced = ["```java", combined, "```"].join("\n");
        stemParts.push(fenced);
      }
    }

    const qText = stemParts.join("\n\n").trim();
    if (!qText) return;

    const answers: RawVarsityAnswer[] = [];
    root.find("div.w-full.p-4").each((_, opt) => {
      const optEl = $(opt);
      const text = optEl.find("p").first().text().trim();
      if (!text) return;
      const isCorrect =
        optEl.hasClass("border-green-500") || optEl.attr("class")?.includes("border-green-500");
      answers.push({ text, isCorrect });
    });
    if (!answers.length) return;

    let explanation = "";
    const explBlock = root
      .find("h4")
      .filter((_, h) => $(h).text().toLowerCase().includes("explanation"))
      .first()
      .parent()
      .find("div.prose")
      .first();
    if (explBlock.length) {
      explanation = explBlock.text().trim();
    }

    out.push({
      question: qText,
      passage: null,
      answers,
      explanation,
      topicName: null,
      graphic_url: null,
    });
  });

  return out;
}

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; status: number }> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: c.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, html: "", status: res.status };
    const html = await res.text();
    return { ok: true, html, status: res.status };
  } catch {
    clearTimeout(t);
    return { ok: false, html: "", status: 0 };
  }
}

/**
 * Varsity "Learn by Concept" lives under /practice/subjects/{slug}/help/{topic}.
 * Topic URLs often appear only inside Next.js RSC/JSON blobs, not as <a> in the first paint.
 */
function extractLearnByConceptHelpPaths(html: string, pathSlug: string): string[] {
  const safe = pathSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(?:https://www\\.varsitytutors\\.com)?(/practice/subjects/${safe}/help/[a-z0-9]+(?:-[a-z0-9]+)*)`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = m[1].split("?")[0].replace(/\/$/, "");
    if (path.toLowerCase().endsWith("/help")) continue;
    out.push(path);
  }
  return out;
}

function discoverLinksFromHtml(html: string, pageUrl: string, pathSlug: string, underscoreSlug: string): string[] {
  const found = new Set<string>();
  const $ = cheerio.load(html);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("javascript:")) return;
    const abs = normalizeQueueUrl(href, pageUrl);
    if (abs && shouldCrawlUrl(abs, pathSlug, underscoreSlug)) found.add(abs);
  });
  for (const path of extractLearnByConceptHelpPaths(html, pathSlug)) {
    const abs = normalizeQueueUrl(path, VARSITY_ORIGIN);
    if (abs && shouldCrawlUrl(abs, pathSlug, underscoreSlug)) found.add(abs);
  }
  return [...found];
}

function discoverHelpLinksFromHtml(html: string, pageUrl: string, pathSlug: string): string[] {
  const found = new Set<string>();
  const $ = cheerio.load(html);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("javascript:")) return;
    const abs = normalizeQueueUrl(href, pageUrl);
    if (!abs) return;
    let pathname: string;
    try {
      pathname = new URL(abs).pathname;
    } catch {
      return;
    }
    if (shouldCrawlHelpTopicPath(pathname, pathSlug)) {
      found.add(abs);
    }
  });

  for (const path of extractLearnByConceptHelpPaths(html, pathSlug)) {
    const abs = normalizeQueueUrl(path, VARSITY_ORIGIN);
    if (!abs) continue;
    let pathname: string;
    try {
      pathname = new URL(abs).pathname;
    } catch {
      continue;
    }
    if (shouldCrawlHelpTopicPath(pathname, pathSlug)) {
      found.add(abs);
    }
  }

  return [...found];
}

export async function scrapeVarsityForSubject(
  subjectCode: string,
  onProgress?: (data: {
    linksCrawled: number;
    rawQuestionsFound: number;
    message: string;
  }) => void,
): Promise<VarsityScrapeResult> {
  const cfg = getVarsitySubjectConfig(subjectCode);
  if (!cfg) {
    throw new Error(`Varsity subject config not found for ${subjectCode}`);
  }

  const slugs = getVarsitySlugsFromPracticeUrl(cfg.practiceUrl);
  if (!slugs) {
    throw new Error(`Could not parse Varsity slugs from ${cfg.practiceUrl}`);
  }

  const { pathSlug, underscoreSlug } = slugs;
  // For all subjects, crawl only /practice/subjects/{slug}/help/... pages.
  const maxUrls = MAX_CRAWL_URLS;
  const delayMs = 300;

  const queued = new Set<string>();
  const queue: string[] = [];

  const offerHelp = (href: string, base?: string) => {
    const norm = normalizeQueueUrl(href, base || VARSITY_ORIGIN);
    if (!norm || queued.has(norm)) return;
    let pathname: string;
    try {
      pathname = new URL(norm).pathname;
    } catch {
      return;
    }
    if (!shouldCrawlHelpTopicPath(pathname, pathSlug)) return;
    queued.add(norm);
    queue.push(norm);
  };

  // Seed queue: help hub only.
  offerHelp(`${VARSITY_ORIGIN}/practice/subjects/${pathSlug}/help`);

  const allQuestions: VarsityQuestion[] = [];
  let linksCrawled = 0;
  let rawQuestionsFound = 0;
  let nextQuestionIdBase = 1000000;

  while (queue.length > 0 && linksCrawled < maxUrls) {
    const pageUrl = queue.shift()!;

    // Absolute safety net: only ever fetch /help pages under the subject slug.
    try {
      const u = new URL(pageUrl);
      const p = u.pathname.toLowerCase();
      const helpRoot = `/practice/subjects/${pathSlug.toLowerCase()}/help`;
      if (p !== helpRoot && !p.startsWith(helpRoot + "/")) {
        continue;
      }
    } catch {
      continue;
    }

    // Short paced delay so we don't hammer Varsity but also don't feel frozen.
    await sleep(delayMs);

    console.log("[VarsityScraper] Fetching page", { subjectCode, pageUrl, linksCrawled });

    // Fast timeout + one quick retry per page so a single slow response
    // doesn't stall the whole crawl for a long time.
    let ok = false;
    let html = "";
    let status = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetchHtml(pageUrl);
      ok = res.ok;
      html = res.html;
      status = res.status;
      if (ok || status === 404) break;
      await sleep(250);
    }
    linksCrawled++;

    if (!ok) {
      if (status === 404 && /diagnostic-test-\d+$/i.test(pageUrl)) {
        /* expected miss */
      }
      continue;
    }

    // Follow only help-topic URLs under /practice/subjects/{slug}/help/...
    for (const next of discoverHelpLinksFromHtml(html, pageUrl, pathSlug)) {
      offerHelp(next);
    }

    let rawQuestions = extractQuestionsFromNextPayload(html, pageUrl);

    // Fallback for help-topic pages across subjects (AP Bio and others like APCSA)
    // where questions are rendered directly in the HTML card instead of embedded
    // in Next.js flight JSON. We only attempt this on `/help/` URLs when the
    // primary extractor found nothing.
    if (!rawQuestions || rawQuestions.length === 0) {
      try {
        const u = new URL(pageUrl);
        if (u.pathname.toLowerCase().includes("/help/")) {
          const htmlQuestions = extractHelpQuestionsFromHtml(html);
          if (htmlQuestions.length > 0) {
            rawQuestions = htmlQuestions;
          }
        }
      } catch {
        // ignore URL parse issues
      }
    }
    rawQuestionsFound += rawQuestions.length;

    if (onProgress) {
      onProgress({
        linksCrawled,
        rawQuestionsFound,
        message: `Calling API... ${linksCrawled} requests, ${rawQuestionsFound} questions received so far.`,
      });
    }
    if (!rawQuestions.length) continue;

    const $$ = cheerio.load(html);
    const conceptPath = extractConceptPath($$);
    const headingText = normalizeText($$("h1").first().text() || $$("h2").first().text() || "");
    const linkTitle = "";

    for (const rq of rawQuestions) {
      nextQuestionIdBase++;
      const qid = nextQuestionIdBase;

      // Temporary verbose logging so we can see progress and exactly which
      // questions are being scraped. This can be removed later once we are
      // confident in the pipeline.
      if (rq.question && rq.question.trim()) {
        console.log("[VarsityScraper] Question scraped", {
          subjectCode,
          pageUrl,
          id: qid,
          question: rq.question.slice(0, 200),
        });
      }

      const promptBlocks: Block[] = [];
      if (
        rq.passage &&
        typeof rq.passage === "string" &&
        rq.passage.trim().length > 0 &&
        rq.passage !== "$undefined"
      ) {
        promptBlocks.push({ type: "text", value: rq.passage });
      }
      if (rq.question && rq.question.trim().length > 0) {
        promptBlocks.push({ type: "text", value: rq.question });
      }
      if (rq.graphic_url && rq.graphic_url !== "$undefined") {
        const imgUrl = new URL(rq.graphic_url, pageUrl).toString();
        promptBlocks.push({ type: "image", url: imgUrl });
      }

      const letters: ("A" | "B" | "C" | "D" | "E")[] = ["A", "B", "C", "D", "E"];
      const choices: Record<"A" | "B" | "C" | "D" | "E", Block[]> = {
        A: [],
        B: [],
        C: [],
        D: [],
        E: [],
      };
      let correctAnswer: string | null = null;

      if (Array.isArray(rq.answers)) {
        rq.answers.forEach((ans, idx) => {
          if (idx >= letters.length) return;
          const letter = letters[idx];
          const blocks: Block[] = [];
          if (ans.text && ans.text.trim().length > 0) {
            blocks.push({ type: "text", value: ans.text });
          }
          choices[letter] = blocks;
          if (ans.isCorrect) {
            correctAnswer = letter;
          }
        });
      }

      const sectionCode = assignSectionFromConceptContext(subjectCode, {
        conceptPath,
        topicName: rq.topicName || null,
        pageTitle: headingText,
        linkTitle,
        promptBlocks,
        choices,
      });

      const hasPrompt = promptBlocks.length > 0;
      const hasChoice = Object.values(choices).some((arr) => arr && arr.length > 0);

      if (!hasPrompt || !hasChoice) continue;

      const conceptHint =
        (rq.topicName && rq.topicName.trim()) ||
        (conceptPath.length ? conceptPath[conceptPath.length - 1] : null) ||
        null;

      allQuestions.push({
        subject_code: subjectCode,
        question_id: qid,
        section_code: sectionCode,
        prompt_blocks: promptBlocks,
        choices,
        correct_answer: correctAnswer,
        explanation: rq.explanation && rq.explanation !== "$undefined" ? rq.explanation : "",
        concept_hint: conceptHint,
      });
    }
  }

  return { questions: allQuestions, linksCrawled, rawQuestionsFound };
}
