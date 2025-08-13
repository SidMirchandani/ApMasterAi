import { users, waitlistEmails, userSubjects, type User, type InsertUser, type WaitlistEmail, type InsertWaitlistEmail, type UserSubject, type InsertUserSubject } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async addToWaitlist(insertEmail: InsertWaitlistEmail): Promise<WaitlistEmail> {
    try {
      const [waitlistEmail] = await db
        .insert(waitlistEmails)
        .values(insertEmail)
        .returning();
      return waitlistEmail;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new Error("Email already registered for waitlist");
      }
      throw error;
    }
  }

  async getWaitlistEmails(): Promise<WaitlistEmail[]> {
    return await db.select().from(waitlistEmails);
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(waitlistEmails)
      .where(eq(waitlistEmails.email, email));
    return !!result;
  }

  async getUserSubjects(userId: number): Promise<UserSubject[]> {
    return await db
      .select()
      .from(userSubjects)
      .where(eq(userSubjects.userId, userId));
  }

  async addUserSubject(userSubject: InsertUserSubject): Promise<UserSubject> {
    const [subject] = await db
      .insert(userSubjects)
      .values(userSubject)
      .returning();
    return subject;
  }

  async removeUserSubject(userId: number, subjectId: string): Promise<void> {
    await db
      .delete(userSubjects)
      .where(and(
        eq(userSubjects.userId, userId),
        eq(userSubjects.subjectId, subjectId)
      ));
  }

  async hasUserSubject(userId: number, subjectId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(userSubjects)
      .where(and(
        eq(userSubjects.userId, userId),
        eq(userSubjects.subjectId, subjectId)
      ));
    return !!result;
  }
}

export const storage = new DatabaseStorage();
