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

import { pgTable, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const userSubjectsSchema = pgTable("user_subjects", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  units: integer("units"),
  difficulty: varchar("difficulty", { length: 50 }),
  examDate: varchar("exam_date", { length: 50 }),
  progress: integer("progress").default(0),
  completedUnits: integer("completed_units").default(0),
  lastStudied: timestamp("last_studied"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const waitlistSchema = pgTable("waitlist", {
});

export const schema = {
  userSubjects: userSubjectsSchema,
  waitlist: waitlistSchema,
};