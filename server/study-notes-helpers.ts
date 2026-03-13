export function isAllowed(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export function flattenPromptText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.value)
    .join(" ");
}

export function isQuotaError(error: any): boolean {
  const msg = (error?.message || error?.toString() || "").toLowerCase();
  const status = error?.status || error?.code || error?.httpCode || 0;
  if (status === 429 || status === "429") return true;
  return msg.includes("quota") || msg.includes("rate") || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("too many requests") || msg.includes("limit");
}

export async function callWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 5,
  baseDelayMs: number = 5000,
  onRetry?: (attempt: number, waitSec: number) => void
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (isQuotaError(error) && attempt < maxRetries) {
        const waitMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 2000;
        const waitSec = Math.round(waitMs / 1000);
        onRetry?.(attempt + 1, waitSec);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export const STUDY_NOTE_PROMPT = `You are an Expert AP Exam Tutor. Write a SHORT "Study Note" that teaches the core concept so students can solve ANY similar problem—not just this one.

**Critical:** Do NOT solve this specific question. Instead, teach the METHOD and FORMULA that works for all problems of this type.

Subject: {{SUBJECT}}

Guidelines:
- **Core Insight (1-2 sentences):** State the key concept and why it matters. Be specific about what students need to recognize.
- **The Formula/Method:** For quantitative subjects (Chem, Physics, Calc, Econ), give the formula in LaTeX ($...$ inline, $$...$$ display) and define variables. For qualitative subjects (History, Gov, Psych, Bio), explain the framework or logic pattern.
- **How-To (2-3 sentences):** Outline the general steps. Use phrases like "First identify X, then apply Y, finally check Z." Do NOT use numbers from this question.
- **Common Trap (1 sentence):** Call out ONE specific mistake students make on this type of problem.

Keep it 3-4 sentences total. Make every word count. Use line breaks between key points. Plain text only—LaTeX $...$ and $$...$$ for math.

Question (context only—teach the concept, don't solve):
{{QUESTION}}

Correct Answer: {{ANSWER}}

Explanation (reference only):
{{EXPLANATION}}

Study Note:`;
