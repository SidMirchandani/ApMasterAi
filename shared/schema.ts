// Firebase Firestore collection interfaces
export interface UserSubject {
  id?: string;
  userId?: string;
  subjectId: string;
  name: string;
  description: string;
  units: number;
  difficulty: string;
  examDate: string | number | Date | { seconds: number } | null;
  progress: number;
  masteryLevel: number;
  lastStudied?: string | number | Date | { seconds: number } | null;
  dateAdded?: string | number | Date | { seconds: number } | null;
  externalResources?: {
    khanAcademy?: string;
    youtubePlaylist?: string;
    officialCED?: string;
  };
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
  /** Set by admin user-stats backfill; when true, backfill skips this user. */
  userStatsBackfilled?: boolean;
  userStatsBackfilledAt?: string | number | Date | { seconds: number } | null;
}

export interface QuestionReport {
  id: string;
  userId: string;
  questionId: string;
  subjectId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Date;
}

// Type helpers
export type CreateQuestionReport = Omit<QuestionReport, 'id' | 'status' | 'createdAt'>;
export type CreateUserSubject = Omit<UserSubject, 'id' | 'dateAdded'>;
export type UpdateUserSubject = Partial<Omit<UserSubject, 'id' | 'userId'>>;
export type CreateWaitlistEntry = Omit<WaitlistEntry, 'id' | 'signedUpAt'>;
export type CreateUser = Omit<User, 'id' | 'createdAt'>;