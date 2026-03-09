import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { getDiagnosticWeightsForSubject } from "../../../server/ap-subject-config";

const DIAGNOSTIC_QUESTION_COUNT = 20;

// Legacy AP CSA section codes (same as questions.ts)
const APCSA_SECTION_QUERY_MAP: Record<string, string[]> = {
  U1: ["U1", "PT", "UO"],
  U2: ["U2", "BEI", "ITR"],
  U3: ["U3", "WC", "INH"],
  U4: ["U4", "ARR", "AL", "TDA", "REC"],
};

function getDifficulty(q: { tags?: string[]; difficulty?: string | null }): "easy" | "medium" | "hard" {
  const raw =
    q.difficulty ||
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

function pickWithDifficultyMix(
  questions: any[],
  targetCount: number
): any[] {
  if (questions.length <= targetCount) {
    return questions.map((q) => ({
      ...q,
      tags: q.tags ?? [],
      difficulty: getDifficulty(q),
    }));
  }
  const withDiff = questions.map((q) => ({ ...q, _d: getDifficulty(q) }));
  const easy = withDiff.filter((q) => q._d === "easy");
  const medium = withDiff.filter((q) => q._d === "medium");
  const hard = withDiff.filter((q) => q._d === "hard");

  const selected: any[] = [];
  const perBucket = Math.max(1, Math.floor(targetCount / 3));
  for (const bucket of [easy, medium, hard]) {
    const shuffle = [...bucket].sort(() => Math.random() - 0.5);
    const n = Math.min(perBucket, shuffle.length, targetCount - selected.length);
    for (let i = 0; i < n; i++) {
      const q = shuffle[i];
      if (q) {
        const { _d, ...rest } = q;
        selected.push({ ...rest, tags: rest.tags ?? [], difficulty: _d });
      }
    }
  }

  const remaining = withDiff.filter((q) => !selected.some((s) => s.id === q.id));
  const shuffleRemaining = remaining.sort(() => Math.random() - 0.5);
  while (selected.length < targetCount && shuffleRemaining.length > 0) {
    const q = shuffleRemaining.shift();
    if (q) {
      const { _d, ...rest } = q;
      selected.push({ ...rest, tags: rest.tags ?? [], difficulty: _d });
    }
  }
  return selected;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subject } = req.query;
  if (!subject || typeof subject !== "string") {
    return res.status(400).json({
      success: false,
      message: "Subject is required",
    });
  }

  const weights = getDiagnosticWeightsForSubject(subject);
  if (!weights) {
    return res.status(400).json({
      success: false,
      message: `Diagnostic not configured for subject: ${subject}`,
    });
  }

  try {
    const db = getDb();
    const questionsRef = db.collection("questions");
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const sectionEntries = Object.entries(weights);
    const selectedQuestions: any[] = [];
    let remaining = DIAGNOSTIC_QUESTION_COUNT;

    for (let i = 0; i < sectionEntries.length; i++) {
      const [sectionCode, weight] = sectionEntries[i];
      const sectionCount =
        i === sectionEntries.length - 1
          ? remaining
          : Math.round((weight / totalWeight) * DIAGNOSTIC_QUESTION_COUNT);

      if (sectionCount <= 0) continue;

      const sectionCodesToQuery =
        subject === "APCSA" && APCSA_SECTION_QUERY_MAP[sectionCode]
          ? APCSA_SECTION_QUERY_MAP[sectionCode]
          : [sectionCode];

      const snapshot =
        sectionCodesToQuery.length === 1
          ? await questionsRef
              .where("subject_code", "==", subject)
              .where("section_code", "==", sectionCode)
              .get()
          : await questionsRef
              .where("subject_code", "==", subject)
              .where("section_code", "in", sectionCodesToQuery)
              .get();

      const sectionQuestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const picked = pickWithDifficultyMix(sectionQuestions, sectionCount);
      selectedQuestions.push(...picked);
      remaining -= picked.length;
    }

    const shuffled = selectedQuestions.sort(() => Math.random() - 0.5);
    const final = shuffled.slice(0, DIAGNOSTIC_QUESTION_COUNT);

    return res.status(200).json({
      success: true,
      data: final,
    });
  } catch (error) {
    console.error("Error fetching diagnostic questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch diagnostic questions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
