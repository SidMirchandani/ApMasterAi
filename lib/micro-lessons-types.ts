/** Firestore `micro_lessons` documents — unit-level read-before-drill content. */

export type MicroLessonStatus = "draft" | "published";

export interface MicroLessonBlock {
  heading?: string;
  body: string;
}

export interface MicroLessonRecord {
  id: string;
  subjectCode: string;
  sectionCode: string;
  unitId?: string;
  unitNumber?: number;
  unitName: string;
  title: string;
  blocks: MicroLessonBlock[];
  estimatedReadMinutes: number;
  status: MicroLessonStatus;
  model?: string;
  generatedAt: string;
  updatedAt: string;
}

export interface MicroLessonGenerateResult {
  title: string;
  estimatedReadMinutes: number;
  blocks: MicroLessonBlock[];
}
