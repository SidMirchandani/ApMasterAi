
import { getDb } from './db';
import { DatabaseRetryHandler } from './db-retry-handler';

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

export class Storage {
  private db = getDb();

  async addToWaitlist(email: string): Promise<WaitlistEntry> {
    return DatabaseRetryHandler.withRetry(async () => {
      // Check if email already exists
      const existingQuery = await this.db.collection('waitlist_emails')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        throw new Error('Email already exists in waitlist');
      }

      const docRef = this.db.collection('waitlist_emails').doc();
      const entry: Omit<WaitlistEntry, 'id'> = {
        email,
        signedUpAt: new Date(),
      };

      await docRef.set(entry);

      return {
        id: docRef.id,
        ...entry,
      };
    });
  }

  async getWaitlistStats(): Promise<{ total: number }> {
    return DatabaseRetryHandler.withRetry(async () => {
      const snapshot = await this.db.collection('waitlist_emails').get();
      return { total: snapshot.size };
    });
  }

  async createUser(firebaseUid: string, email: string, username?: string): Promise<User> {
    return DatabaseRetryHandler.withRetry(async () => {
      const docRef = this.db.collection('users').doc();
      const user: Omit<User, 'id'> = {
        firebaseUid,
        email,
        username,
        createdAt: new Date(),
      };

      await docRef.set(user);

      return {
        id: docRef.id,
        ...user,
      };
    });
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return DatabaseRetryHandler.withRetry(async () => {
      const query = await this.db.collection('users')
        .where('firebaseUid', '==', firebaseUid)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    });
  }

  async getUserSubjects(userId: string): Promise<UserSubject[]> {
    return DatabaseRetryHandler.withRetry(async () => {
      const query = await this.db.collection('user_subjects')
        .where('userId', '==', userId)
        .orderBy('dateAdded', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserSubject[];
    });
  }

  async addUserSubject(subject: Omit<UserSubject, 'id' | 'dateAdded'>): Promise<UserSubject> {
    return DatabaseRetryHandler.withRetry(async () => {
      const docRef = this.db.collection('user_subjects').doc();
      const subjectData: Omit<UserSubject, 'id'> = {
        ...subject,
        dateAdded: new Date(),
      };

      await docRef.set(subjectData);

      return {
        id: docRef.id,
        ...subjectData,
      };
    });
  }

  async updateUserSubject(subjectId: string, updates: Partial<UserSubject>): Promise<UserSubject> {
    return DatabaseRetryHandler.withRetry(async () => {
      const docRef = this.db.collection('user_subjects').doc(subjectId);
      
      await docRef.update(updates);
      
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('Subject not found');
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as UserSubject;
    });
  }

  async deleteUserSubject(subjectId: string): Promise<void> {
    return DatabaseRetryHandler.withRetry(async () => {
      await this.db.collection('user_subjects').doc(subjectId).delete();
    });
  }

  async getUserSubject(subjectId: string): Promise<UserSubject | null> {
    return DatabaseRetryHandler.withRetry(async () => {
      const doc = await this.db.collection('user_subjects').doc(subjectId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as UserSubject;
    });
  }

  async hasUserSubject(userId: string, subjectId: string): Promise<boolean> {
    return DatabaseRetryHandler.withRetry(async () => {
      const query = await this.db.collection('user_subjects')
        .where('userId', '==', userId)
        .where('subjectId', '==', subjectId)
        .limit(1)
        .get();

      return !query.empty;
    });
  }
}

export const storage = new Storage();
