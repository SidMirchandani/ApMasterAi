import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../server/db";
import { SUBJECT_SECTION_CODES } from "../../server/subject-sections";

// Exam weight distribution for different subjects
const EXAM_WEIGHTS: Record<string, Record<string, number>> = {
  APMACRO: {
    BEC: 5, // Basic Economic Concepts: 5-10%
    EIBC: 12, // Economic Indicators & Business Cycle: 12-17%
    NIPD: 17, // National Income & Price Determination: 17-27%
    FS: 18, // Financial Sector: 18-23%
    LRCSP: 20, // Long-Run Consequences: 20-30%
    OEITF: 10, // Open Economy: 10-13%
  },
  APMICRO: {
    BEC: 13.5, // Basic Economic Concepts: 12-15% (avg 13.5%)
    SD: 22.5, // Supply and Demand: 20-25% (avg 22.5%)
    PC: 23.5, // Production, Cost, Perfect Competition: 22-25% (avg 23.5%)
    IMP: 18.5, // Imperfect Competition: 15-22% (avg 18.5%)
    FM: 11.5, // Factor Markets: 10-13% (avg 11.5%)
    MF: 10.5, // Market Failure & Government: 8-13% (avg 10.5%)
  },
  APCSP: {
    CRD: 11.5, // Creative Development: 10-13%
    DAT: 19.5, // Data: 17-22%
    AAP: 32.5, // Algorithms and Programming: 30-35%
    CSN: 13, // Computer Systems and Networks: 11-15%
    IOC: 23.5, // Impact of Computing: 21-26%
  },
  APCHEM: {
    ASP: 8, // Atomic Structure & Properties: 7-9%
    MIS: 8, // Molecular & Ionic Structure: 7-9%
    IMF: 20, // Intermolecular Forces & Properties: 18-22%
    RXN: 8, // Chemical Reactions: 7-9%
    KIN: 8, // Kinetics: 7-9%
    THERMO: 8, // Thermodynamics: 7-9%
    EQM: 8, // Equilibrium: 7-9%
    ACB: 13, // Acids & Bases: 11-15%
    ATD: 8, // Applications of Thermodynamics: 7-9%
  },
  APGOV: {
    FAD: 18.5, // Foundations of American Democracy: 15-22% (avg 18.5%)
    IAB: 30.5, // Interactions Among Branches: 25-36% (avg 30.5%)
    CLCR: 15.5, // Civil Liberties and Civil Rights: 13-18% (avg 15.5%)
    APIB: 12.5, // American Political Ideologies: 10-15% (avg 12.5%)
    PP: 23.5, // Political Participation: 20-27% (avg 23.5%)
  },
  APPSYCH: {
    BIO: 20, // Biological Bases of Behavior: 15-25% (avg 20%)
    COG: 20, // Cognition: 15-25% (avg 20%)
    DEV: 20, // Development and Learning: 15-25% (avg 20%)
    SOC: 20, // Social Psychology and Personality: 15-25% (avg 20%)
    MPH: 20, // Mental and Physical Health: 15-25% (avg 20%)
  },
  // APUSH periods use midpoints of official AP ranges (sum 100)
  APUSH: {
    P1: 5, // Period 1: 1491-1607 (4-6%)
    P2: 7, // Period 2: 1607-1754 (6-8%)
    P3: 13.5, // Period 3: 1754-1800 (10-17%)
    P4: 13.5, // Period 4: 1800-1848 (10-17%)
    P5: 13.5, // Period 5: 1844-1877 (10-17%)
    P6: 13.5, // Period 6: 1865-1898 (10-17%)
    P7: 13.5, // Period 7: 1890-1945 (10-17%)
    P8: 13.5, // Period 8: 1945-1980 (10-17%)
    P9: 5, // Period 9: 1980-Present (4-6%)
  },
  // AP CSA 2026: 4 units, midpoints of official ranges (sum 99)
  APCSA: {
    U1: 20, // Unit 1 Using Objects and Methods: 15–25% (mid 20%)
    U2: 30, // Unit 2 Selection and Iteration: 25–35% (mid 30%)
    U3: 14, // Unit 3 Class Creation: 10–18% (mid 14%)
    U4: 35, // Unit 4 Data Collections: 30–40% (mid 35%)
  },
  APLANG: {
    CRE: 22.5, // Claims, Reasoning, and Evidence: 18-25%
    SS: 22.5, // Synthesizing Sources: 18-25%
    RS: 22.5, // Rhetorical Situation: 18-25%
    OC: 17.5, // Organization and Commentary: 15-20%
    ARG: 17.5, // Argumentation: 15-20%
  },
  APLIT: {
    SF1: 10, // Short Fiction I: 7-13%
    PO1: 10, // Poetry I: 7-13%
    LF1: 10, // Longer Fiction or Drama I: 7-13%
    SF2: 12.5, // Short Fiction II: 10-15%
    PO2: 12.5, // Poetry II: 10-15%
    LF2: 12.5, // Longer Fiction or Drama II: 10-15%
    SF3: 12.5, // Short Fiction III: 10-15%
    PO3: 12.5, // Poetry III: 10-15%
    LF3: 12.5, // Longer Fiction or Drama III: 10-15%
  },
  APBIO: {
    CL: 9.5, // Chemistry of Life: 8-11%
    CSF: 11.5, // Cell Structure and Function: 10-13%
    CE: 14, // Cellular Energetics: 12-16%
    CCC: 12.5, // Cell Communication and Cell Cycle: 10-15%
    HER: 9.5, // Heredity: 8-11%
    GER: 14, // Gene Expression and Regulation: 12-16%
    NS: 16.5, // Natural Selection: 13-20%
    ECO: 12.5, // Ecology: 10-15%
  },
  APSTATS: {
    EOV: 19, // Exploring One-Variable Data: 15-23%
    ETV: 6, // Exploring Two-Variable Data: 5-7%
    CD: 13.5, // Collecting Data: 12-15%
    PRD: 15, // Probability, Random Variables, and Distributions: 10-20%
    SD: 9.5, // Sampling Distributions: 7-12%
    ICP: 13.5, // Inference for Categorical Data: Proportions: 12-15%
    IQM: 14, // Inference for Quantitative Data: Means: 10-18%
    ICC: 3.5, // Inference for Categorical Data: Chi-Square: 2-5%
    IQS: 3.5, // Inference for Quantitative Data: Slopes: 2-5%
  },
  APCALCAB: {
    LIM: 11, // Limits and Continuity: 10-12%
    DDF: 11, // Differentiation: Definition and Fundamental Properties: 10-12%
    DCI: 11, // Differentiation: Composite, Implicit, and Inverse Functions: 9-13%
    CAD: 12.5, // Contextual Applications of Differentiation: 10-15%
    AAD: 16.5, // Analytical Applications of Differentiation: 15-18%
    IAC: 18.5, // Integration and Accumulation of Change: 17-20%
    DE: 9, // Differential Equations: 6-12%
    AI: 12.5, // Applications of Integration: 10-15%
  },
  APCALCBC: {
    LIM: 5.5, // Limits and Continuity: 4-7%
    DDF: 5.5, // Differentiation: Definition and Fundamental Properties: 4-7%
    DCI: 5.5, // Differentiation: Composite, Implicit, and Inverse Functions: 4-7%
    CAD: 7.5, // Contextual Applications of Differentiation: 6-9%
    AAD: 9.5, // Analytical Applications of Differentiation: 8-11%
    IAC: 18.5, // Integration and Accumulation of Change: 17-20%
    DE: 7.5, // Differential Equations: 6-9%
    AI: 7.5, // Applications of Integration: 6-9%
    PPV: 11.5, // Parametric, Polar, and Vector-Valued Functions: 11-12%
    ISS: 17.5, // Infinite Sequences and Series: 17-18%
  },
  APPHYS1: {
    KIN: 12.5, // Kinematics: 10-15%
    FTD: 20.5, // Force and Translational Dynamics: 18-23%
    WEP: 20.5, // Work, Energy, and Power: 18-23%
    LMO: 12.5, // Linear Momentum: 10-15%
    TRD: 12.5, // Torque and Rotational Dynamics: 10-15%
    EMR: 6.5, // Energy and Momentum of Rotating Systems: 5-8%
    OSC: 6.5, // Oscillations: 5-8%
    FLU: 12.5, // Fluids: 10-15%
  },
  APPHYS2: {
    THD: 16.5, // Thermodynamics: 15-18%
    EFP: 16.5, // Electric Force, Field, and Potential: 15-18%
    EC: 16.5, // Electric Circuits: 15-18%
    MEI: 13.5, // Magnetism and Electromagnetism: 12-15%
    GPO: 13.5, // Geometric Optics: 12-15%
    WPO: 13.5, // Waves, Sound, and Physical Optics: 12-15%
    MOD: 13.5, // Modern Physics: 12-15%
  },
  APWORLD: {
    GT: 9, // The Global Tapestry: 8-10%
    NE: 9, // Networks of Exchange: 8-10%
    LBE: 13.5, // Land-Based Empires: 12-15%
    TI: 13.5, // Transoceanic Interconnections: 12-15%
    REV: 13.5, // Revolutions: 12-15%
    COI: 13.5, // Consequences of Industrialization: 12-15%
    GC: 9, // Global Conflict: 8-10%
    CWD: 9, // Cold War and Decolonization: 8-10%
    GLO: 9, // Globalization: 8-10%
  },
  // Backward compatibility alias for AP World History
  APWH: {
    GT: 9,
    NE: 9,
    LBE: 13.5,
    TI: 13.5,
    REV: 13.5,
    COI: 13.5,
    GC: 9,
    CWD: 9,
    GLO: 9,
  },
  APEURO: {
    RE: 12.5, // Renaissance and Exploration: 10-15%
    AR: 12.5, // Age of Reformation: 10-15%
    AC: 12.5, // Absolutism and Constitutionalism: 10-15%
    SPP: 12.5, // Scientific, Philosophical, and Political Developments: 10-15%
    CRR: 12.5, // Conflict, Revolution, and Reaction: 10-15%
    IND: 12.5, // Industrialization and Its Effects: 10-15%
    NPP: 12.5, // 19th-Century Perspectives and Political Developments: 10-15%
    GCF: 12.5, // 20th-Century Global Conflicts: 10-15%
    CCE: 12.5, // Cold War and Contemporary Europe: 10-15%
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
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
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
      const idList = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (idList.length > 0) {
        const questionsRef = db.collection("questions");
        const snapshots = await Promise.all(
          idList.map((id) => questionsRef.doc(id).get()),
        );
        const questions = idList
          .map((id, i) => {
            const doc = snapshots[i];
            const data = doc?.exists ? doc.data() : null;
            return data
              ? { id: doc!.id, ...data, tags: normalizeTags(data) }
              : null;
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
      const questionsRef = db.collection("questions");
      const sectionSelectionTelemetry: Array<{
        sectionCode: string;
        weight: number;
        targetCount: number;
        availableCount: number;
        selectedCount: number;
        shortfall: number;
        redistributedCount: number;
      }> = [];
      // Calculate questions per section based on weights
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      const sectionEntries = Object.entries(weights);
      let remainingQuestions = questionLimit;
      const sectionPools: Record<string, any[]> = {};
      const sectionTargets: Record<string, number> = {};
      const selectedBySection: Record<string, any[]> = {};

      for (let i = 0; i < sectionEntries.length; i++) {
        const [sectionCode, weight] = sectionEntries[i];

        // For the last section, use all remaining questions to ensure we hit exactly the limit
        const sectionQuestionCount =
          i === sectionEntries.length - 1
            ? remainingQuestions
            : Math.round((weight / totalWeight) * questionLimit);
        sectionTargets[sectionCode] = sectionQuestionCount;
        sectionPools[sectionCode] = [];
        selectedBySection[sectionCode] = [];

        if (sectionQuestionCount > 0) {
          // Fetch ALL questions for this section (no limit)
          // APCSA: include legacy section codes (PT, UO, BEI, etc.) so old questions are included
          const sectionCodesToQuery =
            (subject as string) === "APCSA" &&
            APCSA_SECTION_QUERY_MAP[sectionCode]
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

          const sectionQuestions = sectionSnapshot.docs.map((doc) => {
            const data = doc.data();
            return { id: doc.id, ...data, tags: normalizeTags(data) };
          });

          // Shuffle and keep as a section pool; selection happens after all pools are loaded.
          const shuffled = sectionQuestions.sort(() => Math.random() - 0.5);
          sectionPools[sectionCode] = shuffled;
          const selected = shuffled.slice(0, sectionQuestionCount);
          selectedBySection[sectionCode] = selected;
          remainingQuestions -= selected.length;
          sectionSelectionTelemetry.push({
            sectionCode,
            weight,
            targetCount: sectionQuestionCount,
            availableCount: sectionQuestions.length,
            selectedCount: selected.length,
            shortfall: Math.max(0, sectionQuestionCount - selected.length),
            redistributedCount: 0,
          });
        } else {
          sectionSelectionTelemetry.push({
            sectionCode,
            weight,
            targetCount: 0,
            availableCount: 0,
            selectedCount: 0,
            shortfall: 0,
            redistributedCount: 0,
          });
        }
      }

      // Redistribute any shortfall to sections that still have unused inventory.
      let remainingNeeded =
        questionLimit -
        Object.values(selectedBySection).reduce(
          (sum, list) => sum + list.length,
          0,
        );
      if (remainingNeeded > 0) {
        const poolOrder = sectionEntries.map(([sectionCode]) => sectionCode);
        while (remainingNeeded > 0) {
          let addedInPass = 0;
          for (const sectionCode of poolOrder) {
            if (remainingNeeded <= 0) break;
            const pool = sectionPools[sectionCode] || [];
            const alreadySelected = selectedBySection[sectionCode]?.length || 0;
            if (alreadySelected >= pool.length) continue;
            const nextQuestion = pool[alreadySelected];
            if (!nextQuestion) continue;
            selectedBySection[sectionCode].push(nextQuestion);
            const telemetry = sectionSelectionTelemetry.find(
              (entry) => entry.sectionCode === sectionCode,
            );
            if (telemetry) telemetry.redistributedCount += 1;
            remainingNeeded -= 1;
            addedInPass += 1;
          }
          // No section had spare inventory; cannot fill further.
          if (addedInPass === 0) break;
        }
      }

      const selectedQuestions = Object.values(selectedBySection).flat();
      // Final shuffle of all selected questions
      const finalQuestions = selectedQuestions.sort(() => Math.random() - 0.5);

      const isAPCSA = (subject as string) === "APCSA";
      if (process.env.NODE_ENV !== "production") {
        const totalShortfall = sectionSelectionTelemetry.reduce(
          (sum, entry) => sum + entry.shortfall,
          0,
        );
        if (totalShortfall > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            "[API/questions] Weighted full-length generation had section shortfall",
            {
              subject,
              requested: questionLimit,
              returning: finalQuestions.length,
              totalShortfall,
              sectionSelectionTelemetry,
            },
          );
        }
      }

      return res.status(200).json({
        success: true,
        data: finalQuestions,
      });
    }

    // Regular query logic for unit quizzes or subjects without weight config
    const fetchLimit = questionLimit * 4;
    const questionsRef = db.collection("questions");
    let query = questionsRef.where("subject_code", "==", subject as string);

    if (section) {
      const sectionCodesToQuery =
        (subject as string) === "APCSA" &&
        APCSA_SECTION_QUERY_MAP[section as string]
          ? APCSA_SECTION_QUERY_MAP[section as string]
          : [section as string];
      if (sectionCodesToQuery.length === 1) {
        query = query.where("section_code", "==", section as string);
      } else {
        query = query.where("section_code", "in", sectionCodesToQuery);
      }
    }

    const snapshot = await query.limit(fetchLimit).get();
    // If no results and section was specified, log sample documents for debugging
    if (process.env.NODE_ENV !== "production") {
      if (snapshot.empty && section) {
        const sampleQuery = await questionsRef
          .where("subject_code", "==", subject as string)
          .limit(5)
          .get();

        const samples = sampleQuery.docs.map((doc) => ({
          id: doc.id,
          subject_code: doc.data().subject_code,
          section_code: doc.data().section_code,
        }));
      }
    }

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const allQuestions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data, tags: normalizeTags(data) };
    });

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, questionLimit);
    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
