
import Database from "@replit/database";

// Initialize Replit database
const db = new Database();

export interface UserSubject {
  userId: string;
  subjectId: string;
  masteryLevel: number;
  enrolledAt: string;
}

export interface WaitlistEntry {
  email: string;
  createdAt: string;
}

export class ReplitDatabaseService {
  private static instance: ReplitDatabaseService;
  
  static getInstance(): ReplitDatabaseService {
    if (!ReplitDatabaseService.instance) {
      ReplitDatabaseService.instance = new ReplitDatabaseService();
    }
    return ReplitDatabaseService.instance;
  }

  // User Subjects methods
  async getUserSubjects(userId: string): Promise<UserSubject[]> {
    try {
      const key = `user_subjects:${userId}`;
      const subjects = await db.get(key);
      return subjects ? JSON.parse(subjects) : [];
    } catch (error) {
      console.error('Error getting user subjects:', error);
      return [];
    }
  }

  async addUserSubject(userId: string, subjectId: string): Promise<UserSubject> {
    try {
      const subjects = await this.getUserSubjects(userId);
      
      // Check if subject already exists
      const existingIndex = subjects.findIndex(s => s.subjectId === subjectId);
      if (existingIndex !== -1) {
        return subjects[existingIndex];
      }

      const newSubject: UserSubject = {
        userId,
        subjectId,
        masteryLevel: 0,
        enrolledAt: new Date().toISOString()
      };

      subjects.push(newSubject);
      await db.set(`user_subjects:${userId}`, JSON.stringify(subjects));
      return newSubject;
    } catch (error) {
      console.error('Error adding user subject:', error);
      throw error;
    }
  }

  async removeUserSubject(userId: string, subjectId: string): Promise<boolean> {
    try {
      const subjects = await this.getUserSubjects(userId);
      const filteredSubjects = subjects.filter(s => s.subjectId !== subjectId);
      
      if (filteredSubjects.length === subjects.length) {
        return false; // Subject not found
      }

      await db.set(`user_subjects:${userId}`, JSON.stringify(filteredSubjects));
      return true;
    } catch (error) {
      console.error('Error removing user subject:', error);
      throw error;
    }
  }

  async updateSubjectMastery(userId: string, subjectId: string, masteryLevel: number): Promise<UserSubject | null> {
    try {
      const subjects = await this.getUserSubjects(userId);
      const subjectIndex = subjects.findIndex(s => s.subjectId === subjectId);
      
      if (subjectIndex === -1) {
        return null; // Subject not found
      }

      subjects[subjectIndex].masteryLevel = masteryLevel;
      await db.set(`user_subjects:${userId}`, JSON.stringify(subjects));
      return subjects[subjectIndex];
    } catch (error) {
      console.error('Error updating subject mastery:', error);
      throw error;
    }
  }

  // Waitlist methods
  async addToWaitlist(email: string): Promise<boolean> {
    try {
      // Check if email already exists
      const existingEmails = await this.getWaitlistEmails();
      if (existingEmails.includes(email)) {
        return false; // Email already exists
      }

      const entry: WaitlistEntry = {
        email,
        createdAt: new Date().toISOString()
      };

      // Add to individual email key for easy lookup
      await db.set(`waitlist:${email}`, JSON.stringify(entry));
      
      // Add to master list
      const allEntries = await this.getWaitlistEntries();
      allEntries.push(entry);
      await db.set('waitlist_entries', JSON.stringify(allEntries));
      
      return true;
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      throw error;
    }
  }

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    try {
      const entries = await db.get('waitlist_entries');
      return entries ? JSON.parse(entries) : [];
    } catch (error) {
      console.error('Error getting waitlist entries:', error);
      return [];
    }
  }

  async getWaitlistEmails(): Promise<string[]> {
    try {
      const entries = await this.getWaitlistEntries();
      return entries.map(entry => entry.email);
    } catch (error) {
      console.error('Error getting waitlist emails:', error);
      return [];
    }
  }

  async getWaitlistStats(): Promise<{ total: number; recent: number }> {
    try {
      const entries = await this.getWaitlistEntries();
      const total = entries.length;
      
      // Get entries from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recent = entries.filter(entry => 
        new Date(entry.createdAt) > sevenDaysAgo
      ).length;

      return { total, recent };
    } catch (error) {
      console.error('Error getting waitlist stats:', error);
      return { total: 0, recent: 0 };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await db.set('health_check', 'ok');
      const result = await db.get('health_check');
      return result === 'ok';
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const replitDb = ReplitDatabaseService.getInstance();
export default replitDb;
