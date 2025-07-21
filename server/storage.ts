import { users, waitlistEmails, type User, type InsertUser, type WaitlistEmail, type InsertWaitlistEmail } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  addToWaitlist(email: InsertWaitlistEmail): Promise<WaitlistEmail>;
  getWaitlistEmails(): Promise<WaitlistEmail[]>;
  isEmailInWaitlist(email: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private waitlistEmails: Map<number, WaitlistEmail>;
  private currentUserId: number;
  private currentWaitlistId: number;

  constructor() {
    this.users = new Map();
    this.waitlistEmails = new Map();
    this.currentUserId = 1;
    this.currentWaitlistId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async addToWaitlist(insertEmail: InsertWaitlistEmail): Promise<WaitlistEmail> {
    // Check if email already exists
    const existingEmail = Array.from(this.waitlistEmails.values()).find(
      (entry) => entry.email === insertEmail.email
    );
    
    if (existingEmail) {
      throw new Error("Email already registered for waitlist");
    }

    const id = this.currentWaitlistId++;
    const waitlistEmail: WaitlistEmail = {
      id,
      email: insertEmail.email,
      signedUpAt: new Date(),
    };
    this.waitlistEmails.set(id, waitlistEmail);
    return waitlistEmail;
  }

  async getWaitlistEmails(): Promise<WaitlistEmail[]> {
    return Array.from(this.waitlistEmails.values());
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    return Array.from(this.waitlistEmails.values()).some(
      (entry) => entry.email === email
    );
  }
}

export const storage = new MemStorage();
