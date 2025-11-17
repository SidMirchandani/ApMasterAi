
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import { getFirebaseAdmin } from '../../../server/firebase-admin';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Get Firebase Admin instances
const firebaseAdmin = getFirebaseAdmin();
if (!firebaseAdmin) {
  throw new Error('Firebase Admin not initialized');
}

const db = firebaseAdmin.firestore;
const storage = firebaseAdmin.storage;

interface BlockText {
  type: "text";
  value: string;
}

interface BlockImage {
  type: "image";
  url: string;
}

type Block = BlockText | BlockImage;

interface QuestionJSON {
  subject_code: string;
  question_id: number;
  prompt_blocks: Block[];
  choices: Record<"A"|"B"|"C"|"D"|"E", Block[]>;
  correct_answer: string;
  explanation: string;
  section_code: string;
}

async function uploadImageToStorage(
  localPath: string,
  storagePath: string,
  subjectCode: string
): Promise<string> {
  const bucket = storage.bucket('gen-lang-client-0260042933.firebasestorage.app');

  // Check bucket exists
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error(`Storage bucket does not exist: ${bucket.name}`);
    }
  } catch (error: any) {
    console.error('Bucket check failed:', error.message);
    throw new Error(`Cannot access storage bucket: ${error.message}`);
  }

  // Add subject folder
  const pathWithSubject = `questions/${subjectCode}/${storagePath.replace('questions/', '')}`;
  const file = bucket.file(pathWithSubject);

  await bucket.upload(localPath, {
    destination: pathWithSubject,
    metadata: {
      contentType: 'image/png',
    },
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${pathWithSubject}`;
}

async function uploadBlockImages(
  blocks: Block[],
  imagesBasePath: string,
  questionId: number,
  subjectCode: string
): Promise<{ blocks: Block[]; imagesUploaded: number }> {
  const updatedBlocks: Block[] = [];
  let imagesUploaded = 0;

  for (const block of blocks) {
    if (block.type === 'image') {
      const filename = block.url;
      const localPath = path.join(imagesBasePath, String(questionId), filename);

      try {
        const stats = await fs.stat(localPath);
        if (stats.isFile()) {
          const storagePath = `questions/${questionId}/${filename}`;
          const url = await uploadImageToStorage(localPath, storagePath, subjectCode);
          updatedBlocks.push({ type: 'image', url });
          imagesUploaded++;
        } else {
          console.warn(`Not a file: ${localPath}`);
          updatedBlocks.push(block);
        }
      } catch (err: any) {
        console.warn(`Missing image: ${localPath}`, err.message);
        updatedBlocks.push(block);
      }
    } else {
      updatedBlocks.push(block);
    }
  }

  return { blocks: updatedBlocks, imagesUploaded };
}

async function processQuestion(
  questionData: QuestionJSON,
  imagesBasePath: string
): Promise<{
  docId: string;
  imagesUploaded: number;
}> {
  const {
    subject_code,
    question_id,
    prompt_blocks,
    choices,
    correct_answer,
    explanation,
    section_code
  } = questionData;

  const answerIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(correct_answer);

  let totalImagesUploaded = 0;

  // Upload images in prompt_blocks
  const { blocks: updatedPromptBlocks, imagesUploaded: promptImages } = await uploadBlockImages(
    prompt_blocks,
    imagesBasePath,
    question_id,
    subject_code
  );
  totalImagesUploaded += promptImages;

  // Upload images in choices
  const updatedChoices: Record<"A"|"B"|"C"|"D"|"E", Block[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: []
  };

  for (const choiceKey of ['A', 'B', 'C', 'D', 'E'] as const) {
    const choiceBlocks = choices[choiceKey] || [];
    const { blocks: updatedChoiceBlocks, imagesUploaded: choiceImages } = await uploadBlockImages(
      choiceBlocks,
      imagesBasePath,
      question_id,
      subject_code
    );
    updatedChoices[choiceKey] = updatedChoiceBlocks;
    totalImagesUploaded += choiceImages;
  }

  const docId = `${subject_code}_${section_code}_Q${question_id}`;

  await db.collection('questions').doc(docId).set({
    subject_code,
    section_code,
    question_id,
    prompt_blocks: updatedPromptBlocks,
    choices: updatedChoices,
    answerIndex,
    explanation: explanation || '',
    mode: 'SECTION',
    test_slug: '',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    rand: Math.random(),
  });

  return { docId, imagesUploaded: totalImagesUploaded };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tmpDir = path.join(process.cwd(), 'tmp_import');
  let uploadedFilePath = '';

  try {
    const form = formidable({
      uploadDir: process.cwd(),
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024,
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    uploadedFilePath = uploadedFile.filepath;

    const zip = new AdmZip(uploadedFilePath);
    await fs.mkdir(tmpDir, { recursive: true });
    zip.extractAllTo(tmpDir, true);

    let questionsDir = path.join(tmpDir, 'export', 'questions');
    let imagesDir = path.join(tmpDir, 'export', 'images');

    try {
      await fs.access(questionsDir);
    } catch {
      questionsDir = path.join(tmpDir, 'questions');
      imagesDir = path.join(tmpDir, 'images');
    }

    const questionFiles = await fs.readdir(questionsDir);
    const results = [];
    let totalImagesUploaded = 0;

    for (const filename of questionFiles) {
      if (!filename.endsWith('.json')) continue;

      const filePath = path.join(questionsDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const questionData: QuestionJSON = JSON.parse(content);

      const result = await processQuestion(questionData, imagesDir);
      results.push(result.docId);
      totalImagesUploaded += result.imagesUploaded;
    }

    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.unlink(uploadedFilePath);

    return res.status(200).json({
      success: true,
      imported: results.length,
      docs: results,
      images_uploaded: totalImagesUploaded,
    });

  } catch (error: any) {
    console.error('Import error:', error);

    try {
      if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
      if (uploadedFilePath) await fs.unlink(uploadedFilePath);
    } catch {}

    return res.status(500).json({
      error: 'Import failed',
      message: error.message || 'Unknown error',
    });
  }
}
