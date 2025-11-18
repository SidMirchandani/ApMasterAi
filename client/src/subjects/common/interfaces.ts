
export interface SubjectMetadata {
  subjectCode: string;
  displayName: string;
  description: string;
  difficulty: string;
  examDate: string;
  apiCode: string; // e.g., "APMACRO"
}

export interface SubjectSection {
  code: string;
  name: string;
  weight: string;
  unitNumber?: number;
}

export interface SubjectUnit {
  id: string;
  title: string;
  description: string;
  examWeight: string;
  progress: number;
}

export interface APSubject {
  subjectCode: string;
  displayName: string;
  metadata: SubjectMetadata;
  units: SubjectUnit[];
  sections: SubjectSection[];
  unitToSectionMap: Record<string, string>; // e.g., { "unit1": "BEC" }
}
