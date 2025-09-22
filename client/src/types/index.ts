
export interface Subject {
  id?: string;
  name: string;
  description?: string;
  units?: number;
  difficulty?: string;
  examDate?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserSubject extends Subject {
  userId: string;
  progress?: number;
  completedUnits?: number;
  lastStudied?: Date;
}

export interface APSubject {
  id: string;
  name: string;
  description: string;
  units: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Very Hard";
  examDate: string;
}
