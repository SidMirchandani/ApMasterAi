
export interface Unit {
  id: string;
  title: string;
  description: string;
  examWeight: string;
  progress: number;
}

export interface SubjectMetadata {
  id: string;
  name: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string;
}
