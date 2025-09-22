import { getDb, databaseManager } from './db';
import { DatabaseRetryHandler } from './db-retry-handler';
import { eq, and } from 'drizzle-orm'; // Assuming drizzle-orm is used for database operations

// Placeholder for schema definition, assuming it's available or defined elsewhere
// const schema = {
//   userSubjects: {
//     id: { type: 'string' },
//     userId: { type: 'string' },
//     subjectId: { type: 'string' },
//     name: { type: 'string' },
//     description: { type: 'string' },
//     units: { type: 'number' },
//     difficulty: { type: 'string' },
//     examDate: { type: 'string' },
//     progress: { type: 'number' },
//     masteryLevel: { type: 'number' },
//     lastStudied: { type: 'Date' },
//     dateAdded: { type: 'Date' },
//   },
//   // other schema definitions...
// };


// Placeholder for types, assuming they are defined in a separate file or globally
// If not, these interfaces would need to be defined here or imported.

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

// Development mode in-memory storage
const devStorage = {
  users: new Map(),
  userSubjects: new Map(),
  waitlist_emails: new Map(),
  nextUserId: 1,
  nextSubjectId: 1,
  nextWaitlistId: 1,
};

const isDevelopmentMode = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
  const db = databaseManager.getDatabase();
  // If NODE_ENV is 'development' or if REPL_ID is present (indicating Replit), AND there's no active DB connection, assume development mode.
  return (isDev || isReplit) && !db;
};

export class Storage {
  // Assuming 'db' and 'schema' are initialized elsewhere or passed to the constructor
  // private db: any;
  // private schema: any;

  // constructor(db: any, schema: any) {
  //   this.db = db;
  //   this.schema = schema;
  // }

  private getDbInstance() {
    if (isDevelopmentMode()) {
      return null;
    }
    try {
      // Ensure getDb() returns a valid database connection or throws an error
      const db = getDb();
      if (!db) {
        throw new Error("Database connection is not established.");
      }
      return db;
    } catch (error) {
      console.warn("Failed to get database instance:", error);
      // Rethrow or handle the error appropriately
      throw error;
    }
  }

  async addToWaitlist(email: string): Promise<WaitlistEntry> {
    if (isDevelopmentMode()) {
      // Development mode fallback
      for (const [id, entry] of devStorage.waitlist_emails) {
        if (entry.email === email) {
          throw new Error('Email already exists in waitlist');
        }
      }
      const entryId = `dev-waitlist-${devStorage.nextWaitlistId++}`;
      const entry: Omit<WaitlistEntry, 'id'> = {
        email,
        signedUpAt: new Date(),
      };
      devStorage.waitlist_emails.set(entryId, entry);
      return { id: entryId, ...entry };
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      // Check if email already exists
      const existingQuery = await db.collection('waitlist_emails')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        throw new Error('Email already exists in waitlist');
      }

      const docRef = db.collection('waitlist_emails').doc();
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
    if (isDevelopmentMode()) {
      // Development mode fallback
      return { total: devStorage.waitlist_emails.size };
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");
      const snapshot = await db.collection('waitlist_emails').get();
      return { total: snapshot.size };
    });
  }

  async createUser(firebaseUid: string, email: string, username?: string): Promise<User> {
    if (isDevelopmentMode()) {
      // Development mode fallback
      const userId = `dev-user-${devStorage.nextUserId++}`;
      const userData: Omit<User, 'id'> = {
        firebaseUid,
        email,
        username,
        createdAt: new Date(),
      };
      devStorage.users.set(userId, userData);
      return { id: userId, ...userData } as User;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const docRef = db.collection('users').doc();
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
    if (isDevelopmentMode()) {
      // Development mode fallback
      for (const [id, user] of devStorage.users) {
        if (user.firebaseUid === firebaseUid) {
          return { id, ...user } as User;
        }
      }
      return null;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('firebaseUid', '==', firebaseUid).limit(1).get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    });
  }

  async getUserSubjects(userId: string): Promise<UserSubject[]> {
    if (isDevelopmentMode()) {
      // Development mode fallback
      const subjects = [];
      for (const [id, subject] of devStorage.userSubjects) {
        if (subject.userId === userId) {
          subjects.push({ id, ...subject } as UserSubject);
        }
      }
      return subjects;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const query = await db.collection('user_subjects')
        .where('userId', '==', userId)
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserSubject[];
    });
  }

  async addUserSubject(subject: Omit<UserSubject, 'id' | 'dateAdded'>): Promise<UserSubject> {
    if (isDevelopmentMode()) {
      // Development mode fallback
      const subjectId = `dev-subject-${devStorage.nextSubjectId++}`;
      const subjectData: Omit<UserSubject, 'id'> = {
        ...subject,
        dateAdded: new Date(),
      };
      devStorage.userSubjects.set(subjectId, subjectData);
      return { id: subjectId, ...subjectData } as UserSubject;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const docRef = db.collection('user_subjects').doc();
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
    if (isDevelopmentMode()) {
      // Development mode fallback
      const subject = devStorage.userSubjects.get(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }
      const updatedSubject = { ...subject, ...updates };
      devStorage.userSubjects.set(subjectId, updatedSubject);
      return { id: subjectId, ...updatedSubject } as UserSubject;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const docRef = db.collection('user_subjects').doc(subjectId);

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
    if (isDevelopmentMode()) {
      // Development mode fallback
      if (!devStorage.userSubjects.has(subjectId)) {
        throw new Error('Subject not found');
      }
      devStorage.userSubjects.delete(subjectId);
      return;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");
      await db.collection('user_subjects').doc(subjectId).delete();
    });
  }

  async getUserSubject(subjectId: string): Promise<UserSubject | null> {
    if (isDevelopmentMode()) {
      // Development mode fallback
      const subject = devStorage.userSubjects.get(subjectId);
      return subject ? { id: subjectId, ...subject } as UserSubject : null;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const doc = await db.collection('user_subjects').doc(subjectId).get();

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
    if (isDevelopmentMode()) {
      // Development mode fallback
      const subject = devStorage.userSubjects.get(subjectId);
      return subject ? subject.userId === userId : false;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const query = await db.collection('user_subjects')
        .where('userId', '==', userId)
        .where('subjectId', '==', subjectId)
        .limit(1)
        .get();

      return !query.empty;
    });
  }
}

export const storage = new Storage();