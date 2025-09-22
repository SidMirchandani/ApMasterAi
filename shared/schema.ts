// Firebase Firestore collection interfaces
export interface UserSubject {
  id: string;
  userId: string;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string;
  progress: number;
  masteryLevel: number;
  lastStudied?: Date;
  dateAdded: Date;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  signedUpAt: Date;
}

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  username?: string;
  createdAt: Date;
}

// Type helpers
export type CreateUserSubject = Omit<UserSubject, 'id' | 'dateAdded'>;
export type UpdateUserSubject = Partial<Omit<UserSubject, 'id' | 'userId'>>;
export type CreateWaitlistEntry = Omit<WaitlistEntry, 'id' | 'signedUpAt'>;
export type CreateUser = Omit<User, 'id' | 'createdAt'>;