# Varsity Tutors parser — how it works (plain English)

This doc explains what `server/scrapers/varsity-tutors.ts` is doing, without assuming you already know web frameworks or scraping jargon.

---

## 1. What problem are we solving?

Varsity’s Practice Hub pages (practice tests, diagnostics, **Learn by Concept** help pages) show questions in the browser. Our app wants those questions in a **structured format** (prompt, answer choices, correct letter, explanation) so we can store them and use them offline.

The site is built with **Next.js**. That means the first HTML you get is not always a simple list of questions in normal HTML tags. Often the real data is **hidden inside long script blobs** that the browser uses to “hydrate” the page. Our parser’s job is to **find that data, decode it, and normalize it** into our own shape (`VarsityQuestion`).

---

## 2. The big picture (three steps)

1. **Crawl** — Start from a subject’s practice URL, fetch pages, collect more links (queue), repeat until limits.
2. **Extract** — On each page’s HTML, try to pull out a JSON array of `questions`.
3. **Convert** — Turn each raw question into our format (A–E blocks, section guess from keywords, breadcrumbs as “concept hint”).

Steps 1 and 3 are mostly “glue.” The interesting part is step 2.

---

## 3. Why “find `questions` in the HTML” is tricky

Imagine the page ships a giant string that looks like messy JSON mixed with escape characters, like:

- Sometimes: `"questions":[ ... ], "standardizedTestConfig": ...`
- Sometimes (help pages): `"questions":[ ... ], "subject": ...`  
  (Same idea, **different word after the array** — so we can’t only look for `standardizedTestConfig`.)

The parser tries **several patterns** in order:

1. **Practice-style** — Regex that grabs the array right before `"standardizedTestConfig"` (plain or escaped `\"` form).
2. **Learn-by-Concept / help** — Look for the array that ends right before `,"subject":` (or the escaped version `,\"subject\":`).
3. **Fallback** — Scan for `"questions":`, then **bracket-match** `[` … `]` while respecting strings and escapes (so nested brackets inside strings don’t break us).

Once we have a slice that is **only** the `[ ... ]` array, we `JSON.parse` it (after fixing `\"` → `"` when needed).

---

## 4. The “$20” explanation trick (flight / RSC)

Some explanations in that JSON are **not** the full text. They’re a **pointer**, like:

```text
"explanation": "$20"
```

Think of it like a **footnote**: “see note 20.” The actual paragraph lives elsewhere in the same HTML, in a **Next.js “flight”** row.

### What a flight row looks like

Rough pattern in the raw HTML:

```text
20:T452,<exactly N characters of explanation text here...>
```

- **`20`** — ID (like the number in `$20`).
- **`T`** — “type” marker (here, a text chunk).
- **`452`** — **not** “452 in normal counting.” In this format it’s a **hexadecimal** length: how many characters to read after the comma.  
  (We used to read it as base-10 by mistake; that’s why many explanations stayed broken until we fixed it.)
- After the comma comes the **real explanation string**, exactly that many characters long.

Our code:

1. **Scans the whole HTML** for these `id:T<hexlen>,` patterns and builds a **map**: id → full text.
2. For each question, if `explanation` looks like `$` + hex digits only, we **replace** it with `map.get(id)`.

If the map doesn’t have that id, we leave the `$…` as-is (better than crashing).

---

## 5. Turning raw JSON into “our” question

Each raw item has things like:

- `question`, optional `passage`, optional `graphic_url`
- `answers`: list of `{ text, isCorrect }`
- `topicName` (sometimes)

We:

- Build **prompt blocks** (text + optional image).
- Map answers to **A, B, C, D, E** in order (skip if more than five).
- Set `correct_answer` to the letter where `isCorrect` is true.

From the visible page we also read **breadcrumbs** (concept path) when possible, to help label the topic.

---

## 6. How we guess “which unit / section” (AP Bio, etc.)

We don’t always get a clean “Unit 3” tag from Varsity. So we build a **big lowercase blob of text** from:

- Breadcrumb labels (with extra weight on the last few crumbs)
- Page title / topic name
- The question and all choice texts

Then we **score** your subject’s units/keywords (from config) by how often those words appear in that blob. The highest score wins → `section_code`. It’s a **best guess**, not magic.

---

## 7. Crawling: where we look for links

- Normal **`<a href>`** links that match allowed paths (practice subject, diagnostics, flashcards, etc.).
- **Extra:** Help topic URLs are sometimes **only** present inside those big Next.js strings, not as normal links. We regex for paths like  
  `/practice/subjects/{slug}/help/some-topic-slug` and add them to the queue.

For most subjects we still crawl practice, diagnostics, and flashcards. For **AP Biology** we now keep it much simpler (and faster):

- Start from the **practice index** and the **AP Bio help hub**  
  (`/practice/subjects/ap-biology/practice` and `/practice/subjects/ap-biology/help`).
- Only follow links under `/practice/subjects/ap-biology/...` and `/practice/subjects/ap-biology/help/...`.
- Skip diagnostics and flashcards entirely.

We **dedupe** URLs, use a short pause between requests, and cap how many pages we hit per subject so we don’t hammer their servers.

---

## 8. How help-page HTML parsing handles embedded code

Some Learn-by-Concept help pages (including AP Computer Science A topics like
“Assignment Statements and Input”) render the **full question, code snippet,
choices, and explanation directly in the HTML**, instead of (or in addition to)
the flight JSON.

When the main JSON extractor finds **no questions** for a `/help/...` URL, we
fall back to `extractHelpQuestionsFromHtml`:

- It finds the main “Help Questions” card: `div.bg-white.rounded-2xl`.
- Each question lives in a `div.border-b.border-slate-200` inside that card.
- For each question:
  - We grab the **first `div.prose`** in that question block (this holds the
    visible stem and any code snippet).
  - All `<p>` children get concatenated into the **stem text**.
  - Any `<pre>` / `<code>` blocks **within that same `div.prose`** are
    collected, normalized for whitespace, and appended to the stem with
    `\n\n` between blocks.  
    - This is what turns code like the Java snippet from the “quizScore ==
      input.nextDouble();” question into part of the prompt text.
  - Choices still come from the `div.w-full.p-4` option blocks, with
    `border-green-500` marking the correct answer.
  - The explanation is read from the section whose heading text includes
    “Explanation”.

By the time we convert to `VarsityQuestion`, the question’s `prompt_blocks`
will contain a single text block that includes **both**:

1. The natural-language stem (e.g., “Identify the error in the following
   assignment statement and suggest a correction…”), and  
2. The full code block, with line breaks preserved.

This applies across subjects that share the same help-page card layout, so APCSA
questions with code now show up with the inline program text included in the
prompt.

---

## 9. Files to know

| Piece | Where |
|--------|--------|
| Main scraper | `server/scrapers/varsity-tutors.ts` |
| Subject URLs / slugs | `server/varsity-subjects.ts` (and related config) |
| Quick live check (optional) | `scripts/test-varsity-help-extract.mts` |

---

## 10. One-sentence summary

**We download Varsity HTML, cut out the embedded `questions` JSON (two different “end markers” for practice vs help), resolve shorthand explanations like `$20` using Next flight rows (with hex lengths), then convert everything into our internal question format and guess the section from keywords.**

If something breaks in the future, it’s usually because Varsity **changed the shape** of their payload (new markers, new escape style, or flight format). The fix is almost always in the **extract** step, not in the final conversion.
