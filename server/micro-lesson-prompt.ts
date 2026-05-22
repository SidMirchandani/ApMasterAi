export const MICRO_LESSON_PROMPT = `You are an expert AP exam tutor. Write a short **micro-lesson** students read BEFORE a 10-question drill on this unit.

Subject: {{SUBJECT_NAME}} ({{SUBJECT_CODE}})
Unit / section: {{SECTION_NAME}} (code {{SECTION_CODE}})

Requirements:
- Teach the core ideas for THIS unit only — not a full textbook chapter.
- 3–5 blocks; each block has optional "heading" (short) and "body" (2–4 sentences).
- Use plain text; LaTeX $...$ or $$...$$ only when needed for formulas.
- Do NOT reference specific numbered practice questions.
- Focus on what the AP exam tests: key definitions, relationships, and common traps.
- Tone: clear, direct, encouraging.

Output ONLY valid JSON (no markdown fence) with this shape:
{
  "title": "string — lesson title",
  "estimatedReadMinutes": number (2–6),
  "blocks": [
    { "heading": "optional string", "body": "string" }
  ]
}

Sample topics from our question bank (context only):
{{SAMPLE_CONTEXT}}

Micro-lesson JSON:`;

export function buildMicroLessonPrompt(params: {
  subjectName: string;
  subjectCode: string;
  sectionName: string;
  sectionCode: string;
  sampleContext: string;
}): string {
  return MICRO_LESSON_PROMPT.replace(/\{\{SUBJECT_NAME\}\}/g, params.subjectName)
    .replace(/\{\{SUBJECT_CODE\}\}/g, params.subjectCode)
    .replace(/\{\{SECTION_NAME\}\}/g, params.sectionName)
    .replace(/\{\{SECTION_CODE\}\}/g, params.sectionCode)
    .replace(/\{\{SAMPLE_CONTEXT\}\}/g, params.sampleContext || "(No sample questions available.)");
}
