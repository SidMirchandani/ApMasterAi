export interface Unit {
  id: string;
  title: string;
  description: string;
  examWeight: string;
  progress: number;
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
  breakdown?: string[];
}

export interface APSubject {
  subjectCode: string;
  displayName: string;
  units: Unit[];
  sections: Record<string, SubjectSection>;
  metadata: SubjectMetadata;
}