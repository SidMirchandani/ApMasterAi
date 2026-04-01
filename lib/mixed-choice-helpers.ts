/**
 * Detect questions whose answer choices mix plain text and image-based choices.
 * Used by admin filter and fix-image-choices API.
 */

export type ChoiceBlock =
  | { type: "text"; value?: string }
  | { type: "image"; url?: string };

const LETTERS = ["A", "B", "C", "D", "E"] as const;

function getBlocks(
  choices: Record<string, ChoiceBlock[] | undefined> | undefined,
  letter: string,
): ChoiceBlock[] {
  const b = choices?.[letter];
  return Array.isArray(b) ? b : [];
}

function choiceHasImage(blocks: ChoiceBlock[]): boolean {
  return blocks.some((b) => b?.type === "image" && typeof b.url === "string" && b.url.trim().length > 0);
}

/** Non-empty text blocks and no image — a "plain text" answer choice. */
function choiceIsPureText(blocks: ChoiceBlock[]): boolean {
  if (choiceHasImage(blocks)) return false;
  const text = blocks
    .filter((b): b is { type: "text"; value: string } => b?.type === "text")
    .map((b) => (b.value ?? "").trim())
    .join(" ")
    .trim();
  return text.length > 0;
}

export function hasMixedTextAndImageChoices(
  choices: Record<string, ChoiceBlock[] | undefined> | undefined,
): boolean {
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) return false;
  let anyImage = false;
  let anyPureText = false;
  for (const L of LETTERS) {
    const blocks = getBlocks(choices, L);
    if (choiceHasImage(blocks)) anyImage = true;
    if (choiceIsPureText(blocks)) anyPureText = true;
  }
  return anyImage && anyPureText;
}

export function removeDuplicateBlocks(blocks: ChoiceBlock[]): ChoiceBlock[] {
  if (!blocks || blocks.length === 0) return blocks;

  const seen = new Set<string>();
  const uniqueBlocks: ChoiceBlock[] = [];

  for (const block of blocks) {
    let key: string;
    if (block.type === "text") {
      key = `text:${block.value ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push({ ...block });
      }
    } else if (block.type === "image") {
      key = `image:${block.url ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push({ ...block });
      }
    } else {
      key = JSON.stringify(block);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block as ChoiceBlock);
      }
    }
  }

  return uniqueBlocks;
}
