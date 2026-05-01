import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isPlatformAdmin } from "../../../server/platform-admin";
import { requireAdmin } from "../../../server/next-api-auth";

type Block = { type: "text"; value: string } | { type: "image"; url: string };

type VarsityAnswer = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type VarsityQuestion = {
  id: string;
  name: string;
  question: string;
  passage?: string | null;
  answers: VarsityAnswer[];
  explanation?: string | null;
  slug: string;
};

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
  maxDuration: 300,
};

const VARSITY_BASE_URL =
  "https://www.varsitytutors.com/practice/subjects/ap-english-language-and-composition/practice";

const APLANG_SUBJECT_CODE = "APLANG";
const APLANG_SECTION_CODE = "MCQ";

const VARSITY_APLANG_SLUGS: string[] = [
  "practice-test-1",
  "practice-test-2",
  "practice-test-3",
  "practice-test-4",
  "practice-test-5",
  "practice-test-6",
  "practice-test-7",
  "practice-test-8",
  "practice-test-9",
  "practice-test-10",
  "practice-test-11",
  "practice-test-12",
];

async function fetchVarsityQuestions(
  quizSlug: string,
  debug?: (info: any) => void,
): Promise<VarsityQuestion[]> {
  const url = `${VARSITY_BASE_URL}/${quizSlug}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; APMaster/1.0)",
    },
  });

  if (!res.ok) {
    debug?.({
      type: "varsity_http_error",
      quizSlug,
      status: res.status,
      statusText: res.statusText,
      url,
    });
    throw new Error(`Varsity request failed for ${quizSlug} with status ${res.status}`);
  }

  const html = await res.text();

  debug?.({
    type: "varsity_html_info",
    quizSlug,
    url,
    length: html.length,
    hasQuestionsLiteral: html.includes('"questions":'),
    snippet: html.slice(0, 4000),
  });

  const m = html.match(/"questions":(\[.*?\]),"standardizedTestConfig"/s);
  if (!m) {
    debug?.({
      type: "varsity_regex_miss",
      quizSlug,
      url,
      note: 'Regex for "questions":[...] did not match. HTML structure may have changed.',
    });
    throw new Error(`Could not find questions array in Varsity payload for ${quizSlug}`);
  }

  const questionsJson = m[1];
  let parsed: VarsityQuestion[];
  try {
    parsed = JSON.parse(questionsJson) as VarsityQuestion[];
  } catch (err: any) {
    debug?.({
      type: "varsity_json_parse_error",
      quizSlug,
      message: err.message ?? String(err),
      questionsJsonSample: questionsJson.slice(0, 1000),
    });
    throw err;
  }

  return parsed;
}

function varsityQuestionToBlocks(q: VarsityQuestion): {
  prompt_blocks: Block[];
  choices: Record<string, Block[]>;
  answerIndex: number;
} {
  const prompt_blocks: Block[] = [];

  if (q.passage && typeof q.passage === "string" && q.passage.trim().length > 0) {
    prompt_blocks.push({ type: "text", value: q.passage });
  }

  if (q.question && q.question.trim().length > 0) {
    prompt_blocks.push({ type: "text", value: q.question });
  }

  const choices: Record<string, Block[]> = {};
  const letters = ["A", "B", "C", "D", "E"];

  q.answers.forEach((ans, idx) => {
    const letter = letters[idx] ?? String.fromCharCode("A".charCodeAt(0) + idx);
    choices[letter] = [{ type: "text", value: ans.text }];
  });

  const correctIdx = q.answers.findIndex(a => a.isCorrect);
  const answerIndex = correctIdx >= 0 ? correctIdx : 0;

  return { prompt_blocks, choices, answerIndex };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = getDb();
  if (!(await isPlatformAdmin(db, admin.email, admin.uid))) {
    return res.status(403).json({ error: "Forbidden" });
  }

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

  res.write(":" + " ".repeat(2048) + "\n\n");
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  let imported = 0;
  let errors = 0;

  sendEvent({
    type: "status",
    phase: "start",
    message: `Starting Varsity Tutors import for ${APLANG_SUBJECT_CODE} (${VARSITY_APLANG_SLUGS.length} quizzes)...`,
  });

  const BATCH_SIZE = 50;
  let batch = firestore.batch();
  let batchCount = 0;

  try {
    for (const quizSlug of VARSITY_APLANG_SLUGS) {
      sendEvent({
        type: "status",
        phase: "fetch",
        quizSlug,
        message: `Fetching Varsity quiz ${quizSlug}...`,
      });

      let questions: VarsityQuestion[];
      try {
        questions = await fetchVarsityQuestions(quizSlug, info => {
          sendEvent({
            type: "debug",
            quizSlug,
            ...info,
          });
        });
      } catch (err: any) {
        errors++;
        sendEvent({
          type: "error",
          quizSlug,
          message: `Failed to fetch ${quizSlug}: ${err.message ?? String(err)}`,
        });
        continue;
      }

      sendEvent({
        type: "status",
        phase: "scraping",
        quizSlug,
        totalQuestions: questions.length,
        message: `Importing ${questions.length} questions from ${quizSlug}...`,
      });

      questions.forEach((q, idx) => {
        const { prompt_blocks, choices, answerIndex } = varsityQuestionToBlocks(q);

        if (!prompt_blocks.length || Object.keys(choices).length < 2) {
          return;
        }

        const questionNumber = idx + 1;
        const docId = `${APLANG_SUBJECT_CODE}_${APLANG_SECTION_CODE}_VT_${quizSlug}_Q${questionNumber}`;

        batch.set(
          firestore.collection("questions").doc(docId),
          {
            subject_code: APLANG_SUBJECT_CODE,
            section_code: APLANG_SECTION_CODE,
            question_id: questionNumber,
            prompt_blocks,
            choices,
            answerIndex,
            mode: "TEST",
            test_slug: `varsity-${quizSlug}`,
            tags: [],
            updatedAt: new Date(),
            rand: Math.random(),
          },
          { merge: true },
        );

        batchCount++;
        imported++;

        if (batchCount >= BATCH_SIZE) {
          batch.commit().catch(err => {
            errors++;
            sendEvent({
              type: "error",
              message: `Batch commit failed: ${err.message ?? String(err)}`,
            });
          });
          batch = firestore.batch();
          batchCount = 0;
        }
      });
    }

    if (batchCount > 0) {
      await batch.commit().catch(err => {
        errors++;
        sendEvent({
          type: "error",
          message: `Final batch commit failed: ${err.message ?? String(err)}`,
        });
      });
    }

    sendEvent({
      type: "done",
      imported,
      errors,
      message: `Varsity Tutors APLANG import finished: ${imported} questions, ${errors} errors.`,
    });
  } catch (err: any) {
    errors++;
    sendEvent({
      type: "error",
      message: `Unexpected error during Varsity import: ${err.message ?? String(err)}`,
    });
  } finally {
    res.end();
  }
}

