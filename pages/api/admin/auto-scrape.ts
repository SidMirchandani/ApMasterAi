import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";
import { uploadExternalImagesInQuestion } from "../../../server/upload-image-from-url";
import * as cheerio from "cheerio";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

interface SubjectScrapeConfig {
  subjectCode: string;
  crackApPath: string;
  maxQuestionId: number;
  sectionKeywords: Record<string, string[]>;
}

const SCRAPE_CONFIGS: Record<string, SubjectScrapeConfig> = {
  APPSYCH: {
    subjectCode: "APPSYCH",
    crackApPath: "psychology",
    maxQuestionId: 1270,
    sectionKeywords: {
      BIO: ["neuron", "axon", "synapse", "neurotransmitter", "action potential", "brain", "cortex", "hippocampus", "amygdala", "endocrine", "hormone", "nervous system", "genetics", "sleep", "sensation", "perception", "biological"],
      COG: ["memory", "encoding", "retrieval", "problem solving", "heuristic", "decision making", "attention", "intelligence", "iq", "thinking", "perception", "judgment", "cognition", "language"],
      DEV: ["conditioning", "classical", "operant", "reinforcement", "punishment", "development", "attachment", "piaget", "kohlberg", "erikson", "learning", "observational", "acquisition", "lifespan"],
      SOC: ["attribution", "conformity", "obedience", "attitude", "dissonance", "groupthink", "prejudice", "stereotype", "personality", "trait", "motivation", "emotion", "social psychology", "freud"],
      MPH: ["psychological disorder", "anxiety", "depression", "schizophrenia", "therapy", "treatment", "stress", "coping", "ptsd", "health", "positive psychology", "abnormal", "dsm", "mental health"],
    },
  },
  APMACRO: {
    subjectCode: "APMACRO",
    crackApPath: "macroeconomics",
    maxQuestionId: 900,
    sectionKeywords: {
      BEC: ["scarcity", "opportunity cost", "production possibilities", "comparative advantage", "absolute advantage", "specialization", "economic systems"],
      EI: ["circular flow", "gdp", "unemployment", "inflation", "cpi", "business cycle", "recession", "expansion", "economic indicators"],
      NI: ["aggregate demand", "aggregate supply", "multiplier", "fiscal policy", "government spending", "taxes", "ad-as model", "national income"],
      FS: ["money", "banking", "federal reserve", "monetary policy", "interest rates", "money supply", "loanable funds", "financial sector"],
      LR: ["phillips curve", "lras", "natural rate of unemployment", "long-run growth", "productivity", "stabilization"],
      OT: ["balance of payments", "exchange rates", "trade", "exports", "imports", "current account", "capital account", "open economy"],
    },
  },
  APMICRO: {
    subjectCode: "APMICRO",
    crackApPath: "microeconomics",
    maxQuestionId: 900,
    sectionKeywords: {
      BEC: ["scarcity", "opportunity cost", "production possibilities", "comparative advantage", "trade-off", "economic systems"],
      SD: ["supply", "demand", "equilibrium", "surplus", "shortage", "price controls", "elasticity", "consumer surplus", "producer surplus"],
      PC: ["production", "cost", "perfect competition", "marginal cost", "average cost", "profit maximization", "diminishing returns"],
      IMP: ["monopoly", "oligopoly", "monopolistic competition", "game theory", "price discrimination", "barriers to entry", "market power"],
      FM: ["labor market", "wage", "marginal revenue product", "capital", "factor market", "derived demand"],
      MF: ["externality", "public goods", "market failure", "government intervention", "tax", "subsidy", "deadweight loss", "income inequality"],
    },
  },
  APCSP: {
    subjectCode: "APCSP",
    crackApPath: "computer-science-principles",
    maxQuestionId: 800,
    sectionKeywords: {
      CRD: ["collaboration", "program design", "development", "iterative", "incremental", "comments", "documentation", "creative"],
      DAT: ["data", "binary", "compression", "extraction", "metadata", "cleaning", "visualization", "digitization"],
      AAP: ["variables", "assignment", "expressions", "strings", "lists", "procedures", "algorithms", "iteration", "selection", "loop", "function", "parameter"],
      CSN: ["internet", "router", "bandwidth", "protocol", "ip address", "dns", "http", "cybersecurity", "encryption", "network"],
      IOC: ["beneficial effects", "harmful effects", "digital divide", "bias", "crowdsourcing", "legal", "ethical", "privacy", "computing innovation"],
    },
  },
  APCHEM: {
    subjectCode: "APCHEM",
    crackApPath: "chemistry",
    maxQuestionId: 1000,
    sectionKeywords: {
      AMS: ["atom", "mole", "mass spectrometry", "electron configuration", "periodic trends", "ionization energy", "atomic structure"],
      MIP: ["ionic bonding", "covalent bonding", "lewis structure", "vsepr", "hybridization", "molecular geometry"],
      IMF: ["london dispersion", "dipole", "hydrogen bonding", "phase changes", "solutions", "colligative properties", "intermolecular"],
      CR: ["stoichiometry", "limiting reagent", "oxidation", "reduction", "precipitation", "chemical reaction"],
      KIN: ["reaction rate", "rate law", "activation energy", "catalysis", "mechanisms", "collision theory", "kinetics"],
      THE: ["enthalpy", "entropy", "gibbs free energy", "calorimetry", "hess's law", "spontaneity", "thermodynamics"],
      EQ: ["equilibrium constant", "le chatelier", "reaction quotient", "ice table", "kp", "kc", "equilibrium"],
      AB: ["ph", "poh", "buffer", "titration", "weak acid", "strong base", "ka", "kb", "acid", "base"],
      ATD: ["electrochemistry", "galvanic cell", "electrolytic cell", "nernst equation", "cell potential", "faraday"],
    },
  },
  APGOV: {
    subjectCode: "APGOV",
    crackApPath: "us-government-and-politics",
    maxQuestionId: 800,
    sectionKeywords: {
      FOP: ["constitution", "federalism", "separation of powers", "checks and balances", "democracy", "republic", "limited government", "popular sovereignty", "social contract"],
      ILR: ["congress", "presidency", "bureaucracy", "federal courts", "supreme court", "judicial review", "executive orders", "legislation", "veto", "oversight"],
      CLR: ["civil liberties", "civil rights", "first amendment", "due process", "equal protection", "selective incorporation", "bill of rights", "fourteenth amendment", "discrimination"],
      APB: ["political ideology", "political socialization", "public opinion", "polling", "political culture", "liberal", "conservative", "libertarian"],
      PPP: ["voting", "elections", "political parties", "interest groups", "campaigns", "media", "linkage institutions", "voter turnout", "electoral college", "pacs"],
    },
  },
};

const BASE_URL = "https://www.crackap.com";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assignSection(
  promptBlocks: Block[],
  choices: Record<string, Block[]>,
  sectionKeywords: Record<string, string[]>
): string {
  let text = "";
  for (const blk of promptBlocks) {
    if (blk.type === "text") text += " " + blk.value.toLowerCase();
  }
  for (const key of Object.keys(choices)) {
    for (const blk of choices[key]) {
      if (blk.type === "text") text += " " + blk.value.toLowerCase();
    }
  }

  const scores: Record<string, number> = {};
  for (const code of Object.keys(sectionKeywords)) {
    scores[code] = 0;
    for (const kw of sectionKeywords[code]) {
      if (text.includes(kw)) scores[code]++;
    }
  }

  let bestCode = Object.keys(sectionKeywords)[0];
  let bestScore = 0;
  for (const code of Object.keys(scores)) {
    if (scores[code] > bestScore) {
      bestScore = scores[code];
      bestCode = code;
    }
  }
  return bestCode;
}

function extractPromptBlocks($: cheerio.CheerioAPI, mcontent: cheerio.Cheerio<any>, qid: number): Block[] {
  const blocks: Block[] = [];

  mcontent.children().each((_, el) => {
    const $el = $(el);
    if ($el.is("ul") && $el.hasClass("qlist")) return false;

    if ($el.is("p")) {
      let raw = $el.text().trim();
      const lt = raw.toLowerCase();

      if (lt.startsWith("question:")) return;
      if (lt.includes("correct answer")) return;
      if (lt.includes("explanation")) return;

      raw = raw.replace(/^\s*\d+\.\s*/, "");
      if (raw) blocks.push({ type: "text", value: raw });

      $el.find("img").each((i, img) => {
        const src = $(img).attr("src");
        if (src) {
          const imgUrl = src.startsWith("http") ? src : `${BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
          blocks.push({ type: "image", url: imgUrl });
        }
      });
    }
  });

  return blocks;
}

function extractChoices($: cheerio.CheerioAPI, qlist: cheerio.Cheerio<any>, qid: number): Record<string, Block[]> {
  const choices: Record<string, Block[]> = {};

  qlist.find("li").each((_, li) => {
    const $li = $(li);
    const raw = $li.text().trim();
    const m = raw.match(/^([A-E])\.\s*(.*)/s);
    if (!m) return;

    const letter = m[1];
    const textPart = m[2].trim();
    const blks: Block[] = [];

    if (textPart) blks.push({ type: "text", value: textPart });

    $li.find("img").each((i, img) => {
      const src = $(img).attr("src");
      if (src) {
        const imgUrl = src.startsWith("http") ? src : `${BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
        blks.push({ type: "image", url: imgUrl });
      }
    });

    choices[letter] = blks;
  });

  return choices;
}

async function scrapeQuestion(
  subjectCode: string,
  crackApPath: string,
  qid: number,
  sectionKeywords: Record<string, string[]>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = `${BASE_URL}/ap/${crackApPath}/question-${qid}-answer-and-explanation.html`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; APMaster/1.0)",
      },
    });
    clearTimeout(timeout);

    if (res.status === 404) return { success: false, error: "not_found" };
    if (!res.ok) return { success: false, error: `http_${res.status}` };

    const html = await res.text();
    const $ = cheerio.load(html);
    const mcontent = $("div.mcontent");
    if (!mcontent.length) return { success: false, error: "no_mcontent" };

    const promptBlocks = extractPromptBlocks($, mcontent, qid);

    const qlist = mcontent.find("ul.qlist");
    if (!qlist.length) return { success: false, error: "no_qlist" };

    const choices = extractChoices($, qlist, qid);

    let correctAnswer: string | null = null;
    const strongEl = mcontent.find("strong").filter((_, el) => {
      return /correct answer/i.test($(el).text());
    });
    if (strongEl.length) {
      const parentText = strongEl.first().parent().text().trim();
      const match = parentText.match(/Correct Answer:\s*([A-E])/);
      if (match) correctAnswer = match[1];
    }

    const sectionCode = assignSection(promptBlocks, choices, sectionKeywords);

    return {
      success: true,
      data: {
        subject_code: subjectCode,
        question_id: qid,
        prompt_blocks: promptBlocks,
        choices,
        correct_answer: correctAnswer,
        explanation: "",
        section_code: sectionCode,
      },
    };
  } catch (err: any) {
    if (err.name === "AbortError") return { success: false, error: "timeout" };
    return { success: false, error: err.message };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded: { email?: string | null; uid?: string };
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const db = getDb();
  if (!(await isPlatformAdmin(db, decoded.email, decoded.uid ?? null))) {
    return res.status(403).json({ error: "Not an admin" });
  }

  const { subject, startId, endId } = req.body;

  if (!subject || !SCRAPE_CONFIGS[subject]) {
    return res.status(400).json({
      error: "Invalid subject",
      available: Object.keys(SCRAPE_CONFIGS),
    });
  }

  const config = SCRAPE_CONFIGS[subject];
  const start = startId || 1;
  const end = Math.min(endId || config.maxQuestionId, config.maxQuestionId);

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore } = firebaseAdmin;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let consecutiveNotFound = 0;
  const BATCH_SIZE = 50;
  let batch = firestore.batch();
  let batchCount = 0;

  sendEvent({
    type: "start",
    total: end - start + 1,
    subject: config.subjectCode,
    message: `Starting scrape for ${config.subjectCode} (Q${start}–Q${end})`,
  });

  for (let qid = start; qid <= end; qid++) {
    const result = await scrapeQuestion(
      config.subjectCode,
      config.crackApPath,
      qid,
      config.sectionKeywords
    );

    if (result.success && result.data) {
      consecutiveNotFound = 0;
      const data = result.data;
      const { prompt_blocks, choices } = await uploadExternalImagesInQuestion({
        subject_code: data.subject_code,
        question_id: qid,
        prompt_blocks: data.prompt_blocks,
        choices: data.choices,
      });
      const answerIndex = ["A", "B", "C", "D", "E"].indexOf(data.correct_answer || "");
      const docId = `${data.subject_code}_${data.section_code}_Q${qid}`;

      batch.set(firestore.collection("questions").doc(docId), {
        subject_code: data.subject_code,
        section_code: data.section_code,
        question_id: qid,
        prompt_blocks,
        choices,
        answerIndex: answerIndex >= 0 ? answerIndex : 0,
        mode: "SECTION",
        test_slug: "",
        tags: [],
        updatedAt: new Date(),
        rand: Math.random(),
      }, { merge: true });

      batchCount++;
      imported++;

      if (batchCount >= BATCH_SIZE) {
        try {
          await batch.commit();
          sendEvent({
            type: "batch",
            imported,
            skipped,
            errors,
            current: qid,
            total: end - start + 1,
            message: `Committed batch — ${imported} imported so far`,
          });
        } catch (err: any) {
          sendEvent({ type: "error", message: `Batch commit failed: ${err.message}` });
        }
        batch = firestore.batch();
        batchCount = 0;
      }
    } else {
      if (result.error === "not_found") {
        consecutiveNotFound++;
        skipped++;
      } else {
        errors++;
      }
    }

    if (qid % 25 === 0) {
      sendEvent({
        type: "progress",
        current: qid - start + 1,
        total: end - start + 1,
        imported,
        skipped,
        errors,
        message: `Processing Q${qid}...`,
      });
    }

    if (consecutiveNotFound >= 50) {
      sendEvent({
        type: "info",
        message: `50 consecutive not-found — stopping early at Q${qid}`,
      });
      break;
    }

    await sleep(200);
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
    } catch (err: any) {
      sendEvent({ type: "error", message: `Final batch commit failed: ${err.message}` });
    }
  }

  sendEvent({
    type: "complete",
    imported,
    skipped,
    errors,
    message: `Done! Imported ${imported} questions, skipped ${skipped}, errors ${errors}`,
  });

  res.end();
}
