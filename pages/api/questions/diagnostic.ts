import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/db";
import { getDiagnosticDistributionForSubject, getDiagnostic35Distribution } from "../../../server/ap-subject-config";
import { getDifficultyTier } from "../../../server/difficulty";
import { buildCappedPool, generateDiagnosticTest } from "../../../server/diagnostic-generator";

const DIAGNOSTIC_QUESTION_COUNT_35 = 35;
const DIAGNOSTIC_QUESTION_COUNT_LEGACY = 25;

// Legacy AP CSA section codes (same as questions.ts)
const APCSA_SECTION_QUERY_MAP: Record<string, string[]> = {
  U1: ["U1", "PT", "UO"],
  U2: ["U2", "BEI", "ITR"],
  U3: ["U3", "WC", "INH"],
  U4: ["U4", "ARR", "AL", "TDA", "REC"],
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const { subject, section, difficulty, excludeIds, mode } = req.query;
  if (!subject || typeof subject !== "string") {
    res.status(400).json({ success: false, message: "Subject is required" });
    return;
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

      const matchingDiff = allQuestions.filter((q) => getDifficultyTier(q) === diff);
      const pool = matchingDiff.length > 0 ? matchingDiff : allQuestions;
      if (pool.length === 0) {
        res.status(404).json({ success: false, message: "No questions available for this section/difficulty." });
        return;
      }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const { _d, ...rest } = picked as any;
      res.status(200).json({ success: true, data: { ...rest, difficulty: getDifficultyTier(picked) } });
      return;
    } catch (error) {
      console.error("Error fetching next diagnostic question:", error);
      res.status(500).json({ success: false, message: "Failed to fetch question" });
      return;
    }
  }

  const distribution35 = getDiagnostic35Distribution(subject);
  const distributionLegacy = getDiagnosticDistributionForSubject(subject);
  const use35 = distribution35 != null;
  const distribution = use35 ? distribution35! : distributionLegacy;
  if (!distribution) {
    res.status(400).json({
      success: false,
      message: `Diagnostic not configured for subject: ${subject}`,
    });
    return;
  }

  const sectionQueryMap = subject === "APCSA" ? APCSA_SECTION_QUERY_MAP : undefined;

  // --- Pool mode: ?subject=&mode=pool ---
  // Returns capped pool (max 150) when 35-question config exists; else legacy unbounded pool.
  if (mode === "pool") {
    try {
      const db = getDb();
      if (use35) {
        const pool = await buildCappedPool(db, subject, { sectionQueryMap });
        const distributionForPool = getDiagnostic35Distribution(subject)!;
        res.status(200).json({ success: true, data: { pool, distribution: distributionForPool } });
      } else {
        const questionsRef = db.collection("questions");
        const sectionEntries = Object.entries(distribution);
        const sectionFetches = sectionEntries.map(async ([sectionCode]) => {
          const sectionCodesToQuery =
            sectionQueryMap && sectionQueryMap[sectionCode] ? sectionQueryMap[sectionCode] : [sectionCode];
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
            return { id: doc.id, ...data, difficulty: getDifficultyTier(data), tags: data.tags ?? [] };
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
        res.status(200).json({ success: true, data: { pool, distribution } });
      }
      return;
    } catch (error) {
      console.error("Error fetching diagnostic pool:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch diagnostic question pool",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }
  }

  // --- Full diagnostic: 35-question (capped pool + generator) or legacy 25-question ---
  try {
    const db = getDb();
    if (use35) {
      const pool = await buildCappedPool(db, subject, { sectionQueryMap });
      const raw = generateDiagnosticTest(pool, subject, DIAGNOSTIC_QUESTION_COUNT_35);
      const final = raw.map((q) => {
        const { _d, ...rest } = q as any;
        return { ...rest, difficulty: getDifficultyTier(q) };
      });
      res.status(200).json({ success: true, data: final });
    } else {
      const questionsRef = db.collection("questions");
      const sectionEntries = Object.entries(distribution);
      const selectedQuestions: any[] = [];
      for (const [sectionCode, sectionCount] of sectionEntries) {
        if (sectionCount <= 0) continue;
        const sectionCodesToQuery =
          sectionQueryMap && sectionQueryMap[sectionCode] ? sectionQueryMap[sectionCode] : [sectionCode];
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
        const sectionQuestions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const withDiff = sectionQuestions.map((q) => ({
          ...q,
          tags: (q as any).tags ?? [],
          difficulty: getDifficultyTier(q),
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
        const used = new Set(selected.map((q) => q.id));
        const remaining = shuffle(withDiff.filter((q) => !used.has(q.id)));
        while (selected.length < sectionCount && remaining.length > 0) {
          selected.push(remaining.shift());
        }
        selectedQuestions.push(...selected);
      }
      const shuffled = selectedQuestions.sort(() => Math.random() - 0.5);
      const final = shuffled.slice(0, DIAGNOSTIC_QUESTION_COUNT_LEGACY);
      res.status(200).json({ success: true, data: final });
    }
    return;
  } catch (error) {
    console.error("Error fetching diagnostic questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch diagnostic questions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
}
