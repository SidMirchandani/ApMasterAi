import {
  users,
  waitlistEmails,
  userSubjects,
  type User,
  type InsertUser,
  type WaitlistEmail,
  type InsertWaitlistEmail,
  type UserSubject,
  type InsertUserSubject,
} from "@shared/schema";
import { getDb } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { DatabaseRetryHandler } from "./db-retry-handler";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  addToWaitlist(email: InsertWaitlistEmail): Promise<WaitlistEmail>;
  getWaitlistEmails(): Promise<WaitlistEmail[]>;
  isEmailInWaitlist(email: string): Promise<boolean>;
  getUserSubjects(userId: number): Promise<UserSubject[]>;
  addUserSubject(userSubject: InsertUserSubject): Promise<UserSubject>;
  removeUserSubject(userId: number, subjectId: string): Promise<void>;
  hasUserSubject(userId: number, subjectId: string): Promise<boolean>;
  updateSubjectMasteryLevel(
    userId: number,
    subjectId: string,
    masteryLevel: number,
  ): Promise<UserSubject | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user || undefined;
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    });
  }

  async addToWaitlist(
    insertEmail: InsertWaitlistEmail,
  ): Promise<WaitlistEmail> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      try {
        const [waitlistEmail] = await db
          .insert(waitlistEmails)
          .values(insertEmail)
          .returning();
        return waitlistEmail;
      } catch (error: any) {
        if (error.code === "23505") {
          throw new Error("Email already registered for waitlist");
        }
        throw error;
      }
    });
  }

  async getWaitlistEmails(): Promise<WaitlistEmail[]> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      return db.select().from(waitlistEmails);
    });
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [result] = await db
        .select()
        .from(waitlistEmails)
        .where(eq(waitlistEmails.email, email));
      return !!result;
    });
  }

  async getUserSubjects(userId: number): Promise<UserSubject[]> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      return db
        .select()
        .from(userSubjects)
        .where(eq(userSubjects.userId, userId))
        .orderBy(desc(userSubjects.dateAdded));
    });
  }

  async addUserSubject(userSubject: InsertUserSubject): Promise<UserSubject> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [subject] = await db
        .insert(userSubjects)
        .values(userSubject)
        .returning();
      return subject;
    });
  }

  async removeUserSubject(userId: number, subjectId: string): Promise<void> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      await db
        .delete(userSubjects)
        .where(
          and(
            eq(userSubjects.userId, userId),
            eq(userSubjects.subjectId, subjectId),
          ),
        );
    });
  }

  async hasUserSubject(userId: number, subjectId: string): Promise<boolean> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [result] = await db
        .select()
        .from(userSubjects)
        .where(
          and(
            eq(userSubjects.userId, userId),
            eq(userSubjects.subjectId, subjectId),
          ),
        );
      return !!result;
    });
  }

  async updateSubjectMasteryLevel(
    userId: number,
    subjectId: string,
    masteryLevel: number,
  ): Promise<UserSubject | null> {
    return DatabaseRetryHandler.withRetry(async () => {
      const db = await getDb();
      const [updatedSubject] = await db
        .update(userSubjects)
        .set({ masteryLevel })
        .where(
          and(
            eq(userSubjects.userId, userId),
            eq(userSubjects.subjectId, subjectId),
          ),
        )
        .returning();
      return updatedSubject || null;
    });
  }
}

export const storage = new DatabaseStorage();
