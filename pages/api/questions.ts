import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../server/db";
import { SUBJECT_SECTION_CODES } from "../../server/subject-sections";

// Exam weight distribution for different subjects
const EXAM_WEIGHTS: Record<string, Record<string, number>> = {
  "APMACRO": {
    "BEC": 5,      // Basic Economic Concepts: 5-10%
    "EIBC": 12,    // Economic Indicators & Business Cycle: 12-17%
    "NIPD": 17,    // National Income & Price Determination: 17-27%
    "FS": 18,      // Financial Sector: 18-23%
    "LRCSP": 20,   // Long-Run Consequences: 20-30%
    "OEITF": 10,   // Open Economy: 10-13%
  },
  "APMICRO": {
    "BEC": 13.5,   // Basic Economic Concepts: 12-15% (avg 13.5%)
    "SD": 22.5,    // Supply and Demand: 20-25% (avg 22.5%)
    "PC": 23.5,    // Production, Cost, Perfect Competition: 22-25% (avg 23.5%)
    "IMP": 18.5,   // Imperfect Competition: 15-22% (avg 18.5%)
    "FM": 11.5,    // Factor Markets: 10-13% (avg 11.5%)
    "MF": 10.5,    // Market Failure & Government: 8-13% (avg 10.5%)
  },
  "APCSP": {
    "CRD": 11.5,   // Creative Development: 10-13%
    "DAT": 19.5,   // Data: 17-22%
    "AAP": 32.5,   // Algorithms and Programming: 30-35%
    "CSN": 13,     // Computer Systems and Networks: 11-15%
    "IOC": 23.5,   // Impact of Computing: 21-26%
  },
  "APCHEM": {
    "ASP": 8,      // Atomic Structure & Properties: 7-9%
    "MIS": 8,      // Molecular & Ionic Structure: 7-9%
    "IMF": 20,     // Intermolecular Forces & Properties: 18-22%
    "RXN": 8,      // Chemical Reactions: 7-9%
    "KIN": 8,      // Kinetics: 7-9%
    "THERMO": 8,   // Thermodynamics: 7-9%
    "EQM": 8,      // Equilibrium: 7-9%
    "ACB": 13,     // Acids & Bases: 11-15%
    "ATD": 8,      // Applications of Thermodynamics: 7-9%
  },
  "APGOV": {
    "FAD": 18.5,   // Foundations of American Democracy: 15-22% (avg 18.5%)
    "IAB": 30.5,   // Interactions Among Branches: 25-36% (avg 30.5%)
    "CLCR": 15.5,  // Civil Liberties and Civil Rights: 13-18% (avg 15.5%)
    "APIB": 12.5,  // American Political Ideologies: 10-15% (avg 12.5%)
    "PP": 23.5,    // Political Participation: 20-27% (avg 23.5%)
  },
  "APPSYCH": {
    "BIO": 20,     // Biological Bases of Behavior: 15-25% (avg 20%)
    "COG": 20,     // Cognition: 15-25% (avg 20%)
    "DEV": 20,     // Development and Learning: 15-25% (avg 20%)
    "SOC": 20,     // Social Psychology and Personality: 15-25% (avg 20%)
    "MPH": 20,     // Mental and Physical Health: 15-25% (avg 20%)
  },
  // AP CSA 2026: 4 units, midpoints of official ranges (sum 99)
  "APCSA": {
    "U1": 20,      // Unit 1 Using Objects and Methods: 15–25% (mid 20%)
    "U2": 30,      // Unit 2 Selection and Iteration: 25–35% (mid 30%)
    "U3": 14,      // Unit 3 Class Creation: 10–18% (mid 14%)
    "U4": 35,      // Unit 4 Data Collections: 30–40% (mid 35%)
  },
};

if (process.env.NODE_ENV !== "production") {
  for (const [subjectCode, weights] of Object.entries(EXAM_WEIGHTS)) {
    const canonical = SUBJECT_SECTION_CODES[subjectCode];
    if (!canonical) continue;
    const weightKeys = Object.keys(weights).sort();
    const canonicalKeys = [...canonical].sort();
    const mismatched =
      weightKeys.length !== canonicalKeys.length ||
      weightKeys.some((k, i) => k !== canonicalKeys[i]);
    if (mismatched) {
      // eslint-disable-next-line no-console
      console.warn(
        `[EXAM_WEIGHTS] Section codes for ${subjectCode} do not match SUBJECT_SECTION_CODES. ` +
          `weights=${JSON.stringify(weightKeys)}, canonical=${JSON.stringify(canonicalKeys)}`,
      );
    }
  }
}

// Legacy AP CSA section codes mapped to 2026 unit IDs (for backward compatibility)
const APCSA_SECTION_QUERY_MAP: Record<string, string[]> = {
  U1: ["U1", "PT", "UO"],
  U2: ["U2", "BEI", "ITR"],
  U3: ["U3", "WC", "INH"],
  U4: ["U4", "ARR", "AL", "TDA", "REC"],
};

function canonicalSectionForAPCSA(sectionCode: string): string {
  for (const [unit, codes] of Object.entries(APCSA_SECTION_QUERY_MAP)) {
    if (codes.includes(sectionCode)) return unit;
  }
  return sectionCode;
}

/** Normalize tags to a string array so the client always receives a consistent shape (e.g. for study notes in micro-drills). */
function normalizeTags(data: { tags?: unknown }): string[] {
  if (!Array.isArray(data.tags)) return [];
  return data.tags.filter((t: unknown) => typeof t === "string") as string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subject, section, limit, ids } = req.query;

  if (!subject) {
    return res.status(400).json({
      success: false,
      message: "Subject is required",
    });
  }

  try {
    const db = getDb();
    const questionLimit = limit ? parseInt(limit as string) : 25;

    // Fetch specific questions by ID (e.g. for resuming a saved full-length exam)
    if (ids && typeof ids === "string") {
      const idList = ids.split(",").map((s) => s.trim()).filter(Boolean);
      if (idList.length > 0) {
        const questionsRef = db.collection("questions");
        const snapshots = await Promise.all(
          idList.map((id) => questionsRef.doc(id).get())
        );
        const questions = idList
          .map((id, i) => {
            const doc = snapshots[i];
            const data = doc?.exists ? doc.data() : null;
            return data ? { id: doc!.id, ...data, tags: normalizeTags(data) } : null;
          })
          .filter(Boolean);
        return res.status(200).json({
          success: true,
          data: questions,
        });
      }
    }

    // For full-length tests without a section, use proportional distribution
    if (!section && EXAM_WEIGHTS[subject as string]) {
      const weights = EXAM_WEIGHTS[subject as string];
      const questionsRef = db.collection('questions');
      const selectedQuestions: any[] = [];

      console.log("🔍 Fetching proportional questions for full-length test:", {
        subject,
        totalQuestions: questionLimit,
        weights
      });

      // Calculate questions per section based on weights
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      const sectionEntries = Object.entries(weights);
      let remainingQuestions = questionLimit;

      for (let i = 0; i < sectionEntries.length; i++) {
        const [sectionCode, weight] = sectionEntries[i];

        // For the last section, use all remaining questions to ensure we hit exactly the limit
        const sectionQuestionCount = i === sectionEntries.length - 1 
          ? remainingQuestions 
          : Math.round((weight / totalWeight) * questionLimit);

        if (sectionQuestionCount > 0) {
          // Fetch ALL questions for this section (no limit)
          // APCSA: include legacy section codes (PT, UO, BEI, etc.) so old questions are included
          const sectionCodesToQuery =
            (subject as string) === "APCSA" && APCSA_SECTION_QUERY_MAP[sectionCode]
              ? APCSA_SECTION_QUERY_MAP[sectionCode]
              : [sectionCode];
          const sectionSnapshot =
            sectionCodesToQuery.length === 1
              ? await questionsRef
                  .where("subject_code", "==", subject as string)
                  .where("section_code", "==", sectionCode)
                  .get()
              : await questionsRef
                  .where("subject_code", "==", subject as string)
                  .where("section_code", "in", sectionCodesToQuery)
                  .get();

          const sectionQuestions = sectionSnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, tags: normalizeTags(data) };
          });

          // Shuffle all questions and select the needed amount
          const shuffled = sectionQuestions.sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, sectionQuestionCount);
          selectedQuestions.push(...selected);
          remainingQuestions -= selected.length;

          console.log(`  📊 ${sectionCode}: ${selected.length} questions (${weight}% weight) from ${sectionQuestions.length} available`);
        }
      }

      // Final shuffle of all selected questions
      const finalQuestions = selectedQuestions.sort(() => Math.random() - 0.5);

      const isAPCSA = (subject as string) === "APCSA";
      console.log("✅ Returning proportional questions:", {
        requested: questionLimit,
        returning: finalQuestions.length,
        breakdown: Object.entries(weights).map(([section, weight]) => ({
          section,
          count: isAPCSA
            ? finalQuestions.filter(q => canonicalSectionForAPCSA(q.section_code) === section).length
            : finalQuestions.filter(q => q.section_code === section).length,
          weight: `${weight}%`
        }))
      });

      return res.status(200).json({
        success: true,
        data: finalQuestions,
      });
    }

    // Regular query logic for unit quizzes or subjects without weight config
    const fetchLimit = questionLimit * 4;

    console.log("🔍 [API/questions] Querying questions with:", {
      subject,
      section: section || "ALL",
      requestedLimit: questionLimit,
      fetchLimit,
      queryFields: {
        subject_code: subject,
        section_code: section || 'not filtering'
      }
    });

    const questionsRef = db.collection('questions');
    let query = questionsRef.where('subject_code', '==', subject as string);

    if (section) {
      const sectionCodesToQuery =
        (subject as string) === "APCSA" && APCSA_SECTION_QUERY_MAP[section as string]
          ? APCSA_SECTION_QUERY_MAP[section as string]
          : [section as string];
      console.log("📍 [API/questions] Adding section filter:", {
        field: 'section_code',
        value: sectionCodesToQuery.length === 1 ? section : sectionCodesToQuery
      });
      if (sectionCodesToQuery.length === 1) {
        query = query.where('section_code', '==', section as string);
      } else {
        query = query.where('section_code', 'in', sectionCodesToQuery);
      }
    }

    const snapshot = await query
      .limit(fetchLimit)
      .get();

    console.log("📊 [API/questions] Firestore query result:", {
      isEmpty: snapshot.empty,
      size: snapshot.size,
      queriedFor: { 
        subject_code: subject, 
        section_code: section || "ALL" 
      },
      actualResults: snapshot.docs.length
    });

    // If no results and section was specified, log sample documents for debugging
    if (snapshot.empty && section) {
      console.log("❌ [API/questions] No questions found with filters - fetching sample docs for debugging");
      const sampleQuery = await questionsRef
        .where('subject_code', '==', subject as string)
        .limit(5)
        .get();

      const samples = sampleQuery.docs.map(doc => ({
        id: doc.id,
        subject_code: doc.data().subject_code,
        section_code: doc.data().section_code
      }));
      console.log("📋 [API/questions] Sample questions for subject (showing actual DB field values):", {
        requestedSubject: subject,
        requestedSection: section,
        sampleCount: samples.length,
        samples
      });
      console.log("📋 [API/questions] Available section codes in DB for this subject:", 
        [...new Set(samples.map(s => s.section_code))]
      );
    }

    // Also log if we found results but fewer than expected
    if (!snapshot.empty && snapshot.size < questionLimit) {
      console.log("⚠️ [API/questions] Found fewer questions than requested:", {
        requested: questionLimit,
        found: snapshot.size,
        subject_code: subject,
        section_code: section || 'ALL'
      });
    }

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const allQuestions = snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data, tags: normalizeTags(data) };
    });

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, questionLimit);

    console.log("✅ Returning questions:", {
      totalFound: allQuestions.length,
      returning: questions.length,
      firstQuestionId: questions[0]?.id,
      firstQuestionSubject: questions[0]?.subject_code,
      firstQuestionSection: questions[0]?.section_code
    });

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}