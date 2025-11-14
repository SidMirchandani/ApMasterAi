
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const storage = getStorage();

interface QuestionJSON {
  subject_code: string;
  section_code: string;
  question_id: number;
  prompt: string;
  choices: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
  };
  correct_answer: string;
  explanation: string;
  local_images?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

async function uploadImageToStorage(
  localPath: string,
  storagePath: string
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/png',
    },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

async function processQuestion(
  questionData: QuestionJSON,
  imagesBasePath: string
): Promise<{
  docId: string;
  imagesUploaded: number;
}> {
  const { subject_code, section_code, question_id, prompt, choices, correct_answer, explanation, local_images } = questionData;

  // Build choices array [A, B, C, D, E]
  const choicesArray = [
    choices.A || '',
    choices.B || '',
    choices.C || '',
    choices.D || '',
    choices.E || '',
  ];

  // Calculate answerIndex (0-4)
  const answerIndex = correct_answer.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, etc.

  // Process images
  const imageUrls: {
    question: string[];
    A: string[];
    B: string[];
    C: string[];
    D: string[];
    E: string[];
  } = {
    question: [],
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
  };

  let imagesUploaded = 0;

  if (local_images) {
    const questionImagesDir = path.join(imagesBasePath, String(question_id));

    for (const [key, filenames] of Object.entries(local_images)) {
      if (Array.isArray(filenames)) {
        for (const filename of filenames) {
          const localPath = path.join(questionImagesDir, filename);
          
          try {
            await fs.access(localPath);
            const storagePath = `questions/${question_id}/${filename}`;
            const url = await uploadImageToStorage(localPath, storagePath);
            imageUrls[key as keyof typeof imageUrls].push(url);
            imagesUploaded++;
          } catch (err) {
            console.warn(`Image not found: ${localPath}`);
          }
        }
      }
    }
  }

  // Create Firestore document
  const docId = `${subject_code}_${section_code}_Q${question_id}`;
  
  await db.collection('questions').doc(docId).set({
    subject_code,
    section_code,
    question_id,
    prompt,
    choices: choicesArray,
    answerIndex,
    explanation,
    image_urls: imageUrls,
    mode: 'SECTION',
    test_slug: '',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    rand: Math.random(),
  });

  return { docId, imagesUploaded };
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
    // Parse the uploaded file
    const form = formidable({
      uploadDir: process.cwd(),
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB
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

    // Extract ZIP
    const zip = new AdmZip(uploadedFilePath);
    await fs.mkdir(tmpDir, { recursive: true });
    zip.extractAllTo(tmpDir, true);

    // Process questions
    const questionsDir = path.join(tmpDir, 'export', 'questions');
    const imagesDir = path.join(tmpDir, 'export', 'images');

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

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.unlink(uploadedFilePath);

    return res.status(200).json({
      success: true,
      questionsImported: results.length,
      documentIds: results,
      imagesUploaded: totalImagesUploaded,
    });

  } catch (error) {
    console.error('Import error:', error);

    // Cleanup on error
    try {
      if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
      if (uploadedFilePath) await fs.unlink(uploadedFilePath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return res.status(500).json({
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
