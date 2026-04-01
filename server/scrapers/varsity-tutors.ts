import * as cheerio from "cheerio";
import { getVarsitySubjectConfig } from "../varsity-subjects";
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
}

const USER_AGENT = "Mozilla/5.0 (compatible; APMaster/1.0)";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function assignSectionFromHeadingOrKeywords(
  subjectCode: string,
  heading: string | null,
  promptBlocks: Block[],
  choices: Record<string, Block[]>
): string {
  const subjectConfig = getSubjectConfig(subjectCode);
  if (!subjectConfig) return "";

  const headingNorm = heading ? heading.toLowerCase() : "";
  if (headingNorm && subjectConfig.units && subjectConfig.units.length > 0) {
    const direct = subjectConfig.units.find((u) => {
      const titleNorm = u.title.toLowerCase();
      return headingNorm.includes(titleNorm) || titleNorm.includes(headingNorm);
    });
    if (direct) return direct.id;
  }

  // Fallback: duplicate simple keyword scoring like add-subject.ts assignSection helper
  let text = "";
  for (const blk of promptBlocks) {
    if (blk.type === "text") text += " " + blk.value.toLowerCase();
  }
  for (const key of Object.keys(choices)) {
    for (const blk of choices[key] || []) {
      if (blk.type === "text") text += " " + blk.value.toLowerCase();
    }
  }

  const sectionKeywords = subjectConfig.sectionKeywords || {};
  const scores: Record<string, number> = {};
  for (const code of Object.keys(sectionKeywords)) {
    scores[code] = 0;
    for (const kw of sectionKeywords[code]) {
      if (text.includes(kw.toLowerCase())) scores[code]++;
    }
  }

  let bestCode = Object.keys(sectionKeywords)[0] || "";
  let bestScore = 0;
  for (const code of Object.keys(scores)) {
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

function extractQuestionsFromNextPayload(html: string): RawVarsityQuestion[] {
  // Varsity embeds a JSON payload for the practice test in a Next.js data structure.
  // We first try to find a plain JSON array: "questions": [ ... ], "standardizedTestConfig"
  let slice: string | null = null;

  const plainMatch = html.match(/"questions"\s*:\s*(\[[\s\S]*?\])\s*,\s*"standardizedTestConfig"/);
  if (plainMatch) {
    slice = plainMatch[1];
  } else {
    // Fallback: in some builds the payload appears inside a JS string with escaped quotes: \"questions\": [...]
    const escapedMatch = html.match(
      /\\"questions\\":\s*(\[(?:[\s\S]*?)\])\s*,\s*\\"standardizedTestConfig\\"/,
    );
    if (!escapedMatch) {
      const idx = html.indexOf('"questions"');
      const snippet =
        idx === -1
          ? html.slice(0, 500)
          : html.slice(Math.max(0, idx - 200), Math.min(html.length, idx + 800));
      console.warn(
        "[VarsityScraper] questions payload marker not found or regex did not match. Snippet:",
        snippet,
      );
      return [];
    }

    let raw = escapedMatch[1];
    // Unescape \" -> " and \\ -> \ so we get valid JSON
    raw = raw.replace(/\\\\/g, "\\");
    raw = raw.replace(/\\"/g, '"');
    slice = raw;
  }

  try {
    const parsed = JSON.parse(slice);
    if (Array.isArray(parsed)) {
      return parsed as RawVarsityQuestion[];
    }
    return [];
  } catch (err) {
    console.warn("[VarsityScraper] Failed to parse questions payload", err, {
      sample: slice.slice(0, 500),
    });
    return [];
  }
}

export async function scrapeVarsityForSubject(subjectCode: string): Promise<VarsityQuestion[]> {
  const cfg = getVarsitySubjectConfig(subjectCode);
  if (!cfg) {
    throw new Error(`Varsity subject config not found for ${subjectCode}`);
  }

  const allQuestions: VarsityQuestion[] = [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(cfg.practiceUrl, {
    signal: controller.signal,
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  clearTimeout(timeout);
  if (!res.ok) {
    throw new Error(`Failed to fetch Varsity index: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const testLinks: { href: string; title: string }[] = [];
  $("a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = normalizeText($(el).text());
    if (!href && !text) return;
    const hrefMatch = href && /practice-test-\d+/i.test(href);
    const textMatch = text && /practice test\s*\d*/i.test(text);
    if (hrefMatch || textMatch) {
      const absolute = new URL(href, cfg.practiceUrl).toString();
      testLinks.push({ href: absolute, title: text });
    }
  });

  let nextQuestionIdBase = 1000000;

  for (const link of testLinks) {
    await sleep(2000);

    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 20000);
    const pageRes = await fetch(link.href, {
      signal: c.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(t);
    if (!pageRes.ok) continue;
    const pageHtml = await pageRes.text();

    // Prefer Next.js questions payload over trying to infer from DOM
    const rawQuestions = extractQuestionsFromNextPayload(pageHtml);

    if (!rawQuestions.length) {
      continue;
    }

    const $$ = cheerio.load(pageHtml);
    const headingText = normalizeText($$("h1").first().text() || $$("h2").first().text() || "");

    for (const rq of rawQuestions) {
      nextQuestionIdBase++;
      const qid = nextQuestionIdBase;

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
        const imgUrl = new URL(rq.graphic_url, link.href).toString();
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

      const sectionCode = assignSectionFromHeadingOrKeywords(
        subjectCode,
        rq.topicName || headingText || link.title,
        promptBlocks,
        choices
      );

      const hasPrompt = promptBlocks.length > 0;
      const hasChoice = Object.values(choices).some((arr) => arr && arr.length > 0);

      if (!hasPrompt || !hasChoice) continue;

      allQuestions.push({
        subject_code: subjectCode,
        question_id: qid,
        section_code: sectionCode,
        prompt_blocks: promptBlocks,
        choices,
        correct_answer: correctAnswer,
        explanation: rq.explanation && rq.explanation !== "$undefined" ? rq.explanation : "",
      });
    }
  }

  return allQuestions;
}

