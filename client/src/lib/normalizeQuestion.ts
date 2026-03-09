type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

interface ImageUrls {
  question?: string[];
  A?: string[];
  B?: string[];
  C?: string[];
  D?: string[];
  E?: string[];
}

function blocksContainImages(blocks: any[]): boolean {
  if (!blocks || !Array.isArray(blocks)) return false;
  return blocks.some(b => b.type === "image" && b.url);
}

function imageUrlsToBlocks(urls: string[]): Block[] {
  return urls.filter(url => url && typeof url === "string").map(url => ({ type: "image" as const, url }));
}

function ensureBlockFormat(blocks: any): Block[] {
  if (!blocks) return [];
  if (!Array.isArray(blocks)) {
    if (typeof blocks === "string") {
      return [{ type: "text", value: blocks }];
    }
    return [];
  }
  return blocks.map((b: any) => {
    if (typeof b === "string") {
      return { type: "text" as const, value: b };
    }
    if (b.type === "text") {
      return { type: "text" as const, value: b.value || b.content || "" };
    }
    if (b.type === "image") {
      return { type: "image" as const, url: b.url || "" };
    }
    return b;
  });
}

/** Canonical difficulty for display (e.g. diagnostic and unit quiz). Uses question.difficulty or tags "difficulty:easy|medium|hard", default "medium". */
function getDifficulty(q: { difficulty?: string | null; tags?: string[] }): "easy" | "medium" | "hard" {
  const raw =
    (q.difficulty && typeof q.difficulty === "string" ? q.difficulty : "") ||
    (q.tags || []).find((t) => typeof t === "string" && t.startsWith("difficulty:"))
      ?.toString()
      .replace(/^difficulty:/, "")
      .trim()
      .toLowerCase() ||
    "";
  if (raw === "easy") return "easy";
  if (raw === "hard") return "hard";
  return "medium";
}

export function normalizeQuestion(question: any): any {
  if (!question) return question;

  const result = { ...question };

  // Ensure canonical difficulty for UI (diagnostic and unit quiz badges)
  result.difficulty = getDifficulty(question);

  if (!result.prompt_blocks || !Array.isArray(result.prompt_blocks) || result.prompt_blocks.length === 0) {
    if (result.prompt && typeof result.prompt === "string") {
      result.prompt_blocks = [{ type: "text", value: result.prompt }];
    } else {
      result.prompt_blocks = [];
    }
  } else {
    result.prompt_blocks = ensureBlockFormat(result.prompt_blocks);
  }

  if (result.choices && typeof result.choices === "object" && !Array.isArray(result.choices)) {
    const updatedChoices: any = {};
    for (const label of ["A", "B", "C", "D", "E"]) {
      if (result.choices[label] !== undefined) {
        updatedChoices[label] = ensureBlockFormat(result.choices[label]);
      }
    }
    result.choices = updatedChoices;
  } else if (Array.isArray(result.choices)) {
    const choiceObj: any = {};
    result.choices.forEach((choice: any, index: number) => {
      const label = String.fromCharCode(65 + index);
      choiceObj[label] = ensureBlockFormat(typeof choice === "string" ? [{ type: "text", value: choice }] : choice);
    });
    result.choices = choiceObj;
  }

  const imageUrls: ImageUrls | undefined = result.image_urls;
  if (!imageUrls) return result;

  if (imageUrls.question && imageUrls.question.length > 0) {
    if (!blocksContainImages(result.prompt_blocks)) {
      result.prompt_blocks = [...result.prompt_blocks, ...imageUrlsToBlocks(imageUrls.question)];
    }
  }

  if (result.choices && typeof result.choices === "object") {
    const updatedChoices = { ...result.choices };
    for (const label of ["A", "B", "C", "D", "E"] as const) {
      const choiceImageUrls = imageUrls[label];
      if (choiceImageUrls && choiceImageUrls.length > 0) {
        const currentChoiceBlocks: Block[] = Array.isArray(updatedChoices[label]) ? updatedChoices[label] : [];
        if (!blocksContainImages(currentChoiceBlocks)) {
          updatedChoices[label] = [...currentChoiceBlocks, ...imageUrlsToBlocks(choiceImageUrls)];
        }
      }
    }
    result.choices = updatedChoices;
  }

  return result;
}

export function normalizeQuestions(questions: any[]): any[] {
  if (!questions || !Array.isArray(questions)) return questions;
  return questions.map(normalizeQuestion);
}
