
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
  
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                        process.env.FIREBASE_STORAGE_BUCKET ||
                        'gen-lang-client-0260042933.firebasestorage.app';
  
  console.log('Initializing Firebase Admin with storage bucket:', storageBucket);
  
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucket,
  });
}

const db = getFirestore();
const storage = getStorage();

interface QuestionJSON {
  question_id: number;
  prompt: string;
  prompt_images: string[];
  choices: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
  };
  choice_images: {
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
  correct_answer: string;
  explanation: string;
  section_code: string;
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
  const { question_id, prompt, prompt_images, choices, choice_images, correct_answer, explanation, section_code } = questionData;

  // Build choices array [A, B, C, D, E]
  const choicesArray = [
    choices.A || '',
    choices.B || '',
    choices.C || '',
    choices.D || '',
    choices.E || '',
  ];

  // Calculate answerIndex (0-4)
  const answerIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(correct_answer);

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

  const questionImagesDir = path.join(imagesBasePath, String(question_id));

  // Debug: Check if the question image directory exists
  try {
    const dirContents = await fs.readdir(questionImagesDir);
    console.log(`Images for Q${question_id}:`, dirContents);
  } catch (err) {
    console.warn(`Image directory not found for Q${question_id}:`, questionImagesDir);
  }

  // Upload prompt images
  if (prompt_images && Array.isArray(prompt_images)) {
    for (const filename of prompt_images) {
      const localPath = path.join(questionImagesDir, filename);
      
      try {
        const stats = await fs.stat(localPath);
        if (stats.isFile()) {
          const storagePath = `questions/${question_id}/${filename}`;
          const url = await uploadImageToStorage(localPath, storagePath);
          imageUrls.question.push(url);
          imagesUploaded++;
          console.log(`✓ Uploaded: ${filename} → ${url}`);
        }
      } catch (err: any) {
        console.warn(`✗ Image not found: ${localPath}`);
        console.warn(`Error: ${err.message}`);
      }
    }
  }

  // Upload choice images
  if (choice_images) {
    for (const [choiceKey, filenames] of Object.entries(choice_images)) {
      if (Array.isArray(filenames)) {
        for (const filename of filenames) {
          const localPath = path.join(questionImagesDir, filename);
          
          try {
            const stats = await fs.stat(localPath);
            if (stats.isFile()) {
              const storagePath = `questions/${question_id}/${filename}`;
              const url = await uploadImageToStorage(localPath, storagePath);
              imageUrls[choiceKey as keyof typeof imageUrls].push(url);
              imagesUploaded++;
              console.log(`✓ Uploaded choice image: ${filename} → ${url}`);
            }
          } catch (err: any) {
            console.warn(`✗ Choice image not found: ${localPath}`);
            console.warn(`Error: ${err.message}`);
          }
        }
      }
    }
  }

  // Create Firestore document
  const docId = `APCSP_${section_code}_Q${question_id}`;
  
  await db.collection('questions').doc(docId).set({
    subject_code: 'APCSP',
    section_code,
    question_id,
    prompt,
    choices: choicesArray,
    answerIndex,
    explanation: explanation || '',
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

    // Debug: Check what was extracted
    console.log('Extraction complete. Checking structure...');
    const tmpContents = await fs.readdir(tmpDir);
    console.log('tmp_import contents:', tmpContents);

    // Process questions - handle both with and without 'export' folder
    let questionsDir = path.join(tmpDir, 'export', 'questions');
    let imagesDir = path.join(tmpDir, 'export', 'images');
    
    try {
      await fs.access(questionsDir);
    } catch {
      // If export/questions doesn't exist, try questions directly
      questionsDir = path.join(tmpDir, 'questions');
      imagesDir = path.join(tmpDir, 'images');
    }

    console.log('Using questionsDir:', questionsDir);
    console.log('Using imagesDir:', imagesDir);

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
      imported: results.length,
      docs: results,
      images_uploaded: totalImagesUploaded,
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
