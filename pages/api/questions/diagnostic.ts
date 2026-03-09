import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { getDiagnosticDistributionForSubject } from "../../../server/ap-subject-config";

const DIAGNOSTIC_QUESTION_COUNT = 25;

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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subject, section, difficulty, excludeIds, mode } = req.query;
  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ success: false, message: "Subject is required" });
  }

  // --- Single next-question mode (legacy adaptive): ?subject=&section=&difficulty=&excludeIds= ---
  if (section && typeof section === "string") {
    try {
      const db = getDb();
      const questionsRef = db.collection("questions");
      const diff = typeof difficulty === "string" ? difficulty.toLowerCase() : "medium";
      const excluded: string[] = excludeIds
        ? (Array.isArray(excludeIds) ? excludeIds : (excludeIds as string).split(",")).map((s) => s.trim()).filter(Boolean)
        : [];

      const sectionCodesToQuery =
        subject === "APCSA" && APCSA_SECTION_QUERY_MAP[section]
          ? APCSA_SECTION_QUERY_MAP[section]
          : [section];

      const snapshot =
        sectionCodesToQuery.length === 1
          ? await questionsRef
              .where("subject_code", "==", subject)
              .where("section_code", "==", section)
              .get()
          : await questionsRef
              .where("subject_code", "==", subject)
              .where("section_code", "in", sectionCodesToQuery)
              .get();

      const allQuestions = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as any))
        .filter((q) => !excluded.includes(q.id));

      const matchingDiff = allQuestions.filter((q) => getDifficulty(q) === diff);
      const pool = matchingDiff.length > 0 ? matchingDiff : allQuestions;
      if (pool.length === 0) {
        return res.status(404).json({ success: false, message: "No questions available for this section/difficulty." });
      }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const { _d, ...rest } = picked as any;
      return res.status(200).json({ success: true, data: { ...rest, difficulty: getDifficulty(picked) } });
    } catch (error) {
      console.error("Error fetching next diagnostic question:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch question" });
    }
  }

  const distribution = getDiagnosticDistributionForSubject(subject);
  if (!distribution) {
    return res.status(400).json({
      success: false,
      message: `Diagnostic not configured for subject: ${subject}`,
    });
  }

  // --- Pool mode: ?subject=&mode=pool ---
  // Returns all questions per section grouped by difficulty for client-side adaptive selection.
  // Pool contains enough questions to handle difficulty swaps without network calls.
  if (mode === "pool") {
    try {
      const db = getDb();
      const questionsRef = db.collection("questions");
      const sectionEntries = Object.entries(distribution);

      // Fetch all questions for each section in parallel
      const sectionFetches = sectionEntries.map(async ([sectionCode]) => {
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

        const questions = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return { id: doc.id, ...data, difficulty: getDifficulty(data), tags: data.tags ?? [] };
        });

        const easy = shuffle(questions.filter((q) => q.difficulty === "easy"));
        const medium = shuffle(questions.filter((q) => q.difficulty === "medium"));
        const hard = shuffle(questions.filter((q) => q.difficulty === "hard"));

        return { sectionCode, easy, medium, hard };
      });

      const results = await Promise.all(sectionFetches);

      const pool: Record<string, { easy: any[]; medium: any[]; hard: any[] }> = {};
      for (const { sectionCode, easy, medium, hard } of results) {
        pool[sectionCode] = { easy, medium, hard };
      }

      return res.status(200).json({ success: true, data: { pool, distribution } });
    } catch (error) {
      console.error("Error fetching diagnostic pool:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch diagnostic question pool",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // --- Full 25-question plan mode (legacy): ?subject= (no section, no mode=pool) ---
  try {
    const db = getDb();
    const questionsRef = db.collection("questions");
    const sectionEntries = Object.entries(distribution);
    const selectedQuestions: any[] = [];

    for (const [sectionCode, sectionCount] of sectionEntries) {
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

      const withDiff = sectionQuestions.map((q) => ({
        ...q,
        tags: (q as any).tags ?? [],
        difficulty: getDifficulty(q),
      }));

      const easy = shuffle(withDiff.filter((q) => q.difficulty === "easy"));
      const medium = shuffle(withDiff.filter((q) => q.difficulty === "medium"));
      const hard = shuffle(withDiff.filter((q) => q.difficulty === "hard"));

      const selected: any[] = [];
      const perBucket = Math.max(1, Math.floor(sectionCount / 3));
      for (const bucket of [easy, medium, hard]) {
        const n = Math.min(perBucket, bucket.length, sectionCount - selected.length);
        for (let i = 0; i < n; i++) selected.push(bucket[i]);
      }
      // Fill remainder with any leftover
      const used = new Set(selected.map((q) => q.id));
      const remaining = shuffle(withDiff.filter((q) => !used.has(q.id)));
      while (selected.length < sectionCount && remaining.length > 0) {
        selected.push(remaining.shift());
      }

      selectedQuestions.push(...selected);
    }

    const shuffled = selectedQuestions.sort(() => Math.random() - 0.5);
    const final = shuffled.slice(0, DIAGNOSTIC_QUESTION_COUNT);

    return res.status(200).json({ success: true, data: final });
  } catch (error) {
    console.error("Error fetching diagnostic questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch diagnostic questions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
