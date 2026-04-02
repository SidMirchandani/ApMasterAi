import { readFile } from "fs/promises";

/** Mirror extraction from varsity-tutors (import would pull full scraper deps). */
function extractNextFlightStringTable(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(?:^|[^0-9a-fA-F])([0-9a-fA-F]+):T([0-9a-fA-F]+),/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1].toLowerCase();
    const len = parseInt(m[2], 16);
    if (!Number.isFinite(len) || len < 0 || len > 2_000_000) continue;
    const start = m.index + m[0].length;
    const text = html.slice(start, start + len);
    if (text.length === len) map.set(id, text);
  }
  return map;
}

function extractQuestionsArraySliceBySubjectSuffix(html: string): string | null {
  const pairs = [
    { start: '\\"questions\\":[', end: '],\\"subject\\":' },
    { start: '"questions":[', end: '],"subject":' },
  ];
  for (const { start, end } of pairs) {
    const si = html.indexOf(start);
    if (si === -1) continue;
    const arrStart = si + start.lastIndexOf("[");
    const ei = html.indexOf(end, arrStart);
    if (ei !== -1 && ei > arrStart) {
      return html.slice(arrStart, ei + 1);
    }
  }
  return null;
}

function jsonParseQuestionsSlice(slice: string): unknown {
  let s = slice;
  if (s.includes('\\"') || s.includes("\\\\")) {
    s = s.replace(/\\\\/g, "\\");
    s = s.replace(/\\"/g, '"');
  }
  return JSON.parse(s);
}

const url =
  "https://www.varsitytutors.com/practice/subjects/ap-biology/help/cell-cycle";
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; APMaster/1.0)" },
});
const html = await res.text();
console.log("status", res.status, "bytes", html.length);

const tMatches = [...html.matchAll(/[0-9a-fA-F]+:T[0-9a-fA-F]+,/g)];
console.log(":T patterns in page", tMatches.length);

const slice = extractQuestionsArraySliceBySubjectSuffix(html);
console.log("slice", slice ? slice.length : null);
if (slice) {
  const parsed = jsonParseQuestionsSlice(slice) as { explanation?: string }[];
  console.log("questions", Array.isArray(parsed) ? parsed.length : "not array");
  const table = extractNextFlightStringTable(html);
  console.log("flight rows", table.size);
  function resolveRef(raw: string | undefined): string {
    if (!raw || raw === "$undefined") return "";
    const t = raw.trim();
    if (!/^\$[0-9a-fA-F]+$/i.test(t)) return raw ?? "";
    return table.get(t.slice(1).toLowerCase()) ?? raw;
  }
  let stillRef = 0;
  for (const q of parsed) {
    const r = resolveRef(q.explanation);
    if (r.startsWith("$") && /^[0-9a-fA-F]+$/i.test(r.slice(1))) stillRef++;
  }
  console.log("explanations still $ref after resolve", stillRef);
}
