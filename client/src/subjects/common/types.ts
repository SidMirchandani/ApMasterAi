export interface Unit {
  id: string;
  title: string;
  description: string;
  examWeight: string;
  progress: number;
  /** Optional: numeric weight for diagnostic distribution (e.g. 9.5 for 8–11%). */
  unit_weight?: number;
  /** Optional: relative difficulty 1–5 for diagnostic priority. */
  unit_difficulty?: number;
}

export interface SubjectSection {
  code: string;
  name: string;
  unitNumber: number;
}

export interface SubjectMetadata {
  displayName: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string;
  examTitle?: string;
  /** Number of MCQ options (4 = A-D, 5 = A-E). Default 5. */
  mcqOptionCount?: number;
  examSections?: Array<{
    title: string;
    details: string;
    description: string;
  }>;
  /** Breakdown of exam sections. Can be simple strings or named weights. */
  breakdown?: string[] | { name: string; weight: string }[];
}

export interface APSubject {
  subjectCode: string;
  displayName: string;
  units: Unit[];
  sections: Record<string, SubjectSection>;
  metadata: SubjectMetadata;
}