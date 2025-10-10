import { getDb, databaseManager } from './db';
import { DatabaseRetryHandler } from './db-retry-handler';
import * as admin from 'firebase-admin'; // Assuming admin is needed for FieldValue

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
  unitProgress?: { [unitId: string]: { status: string; mcqScore: number; lastPracticed: Date } };
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
  private getDbInstance() {
    if (isDevelopmentMode()) {
      return null;
    }
    try {
      // Ensure getDb is properly imported or defined and returns a Firestore instance
      // If getDb() relies on admin.initializeApp(), that should be handled elsewhere.
      return getDb();
    } catch (error) {
      console.warn("Failed to get database instance:", error);
      return null;
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

  async addUserSubject(subject: Omit<UserSubject, 'id' | 'dateAdded' | 'unitProgress'>): Promise<UserSubject> {
    const now = new Date();
    
    if (isDevelopmentMode()) {
      // Development mode fallback
      const subjectId = `dev-subject-${devStorage.nextSubjectId++}`;
      const subjectData: Omit<UserSubject, 'id'> = {
        ...subject,
        dateAdded: now,
        unitProgress: {}, // Initialize unitProgress in dev mode
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
        dateAdded: now,
        unitProgress: {}, // Initialize unitProgress
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
    console.log("[Storage] deleteUserSubject called with ID:", subjectId);

    if (isDevelopmentMode()) {
      // Development mode fallback
      if (!devStorage.userSubjects.has(subjectId)) {
        console.log("[Storage] Subject not found in dev storage:", subjectId);
        throw new Error('Subject not found');
      }
      devStorage.userSubjects.delete(subjectId);
      console.log("[Storage] Deleted from dev storage:", subjectId);
      return;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      console.log("[Storage] Attempting to delete from Firestore:", subjectId);
      await db.collection('user_subjects').doc(subjectId).delete();
      console.log("[Storage] Successfully deleted from Firestore:", subjectId);
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

  async updateSubjectMasteryLevel(
    userId: string,
    subjectId: string,
    masteryLevel: number
  ): Promise<any> {
    const db = getDb(); // Assuming getDb() is available and returns a Firestore instance
    const subjectsRef = db.collection("user_subjects");

    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      throw new Error("Subject not found");
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      masteryLevel: masteryLevel,
      lastStudied: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await doc.ref.get();
    return { id: updated.id, ...updated.data() };
  }

  async updateUnitProgress(
    userId: string,
    subjectId: string,
    unitId: string,
    mcqScore: number
  ): Promise<any> {
    const db = getDb(); // Assuming getDb() is available and returns a Firestore instance
    const subjectsRef = db.collection("user_subjects");

    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      throw new Error("Subject not found");
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const unitProgress = data.unitProgress || {};

    // Determine status based on score
    let status = "attempted"; // Default to attempted
    if (mcqScore >= 90) {
      status = "mastered";
    } else if (mcqScore >= 80) {
      status = "proficient";
    } else if (mcqScore >= 70) {
      status = "familiar";
    } else if (mcqScore < 50) { // Explicitly handle "Not stared" or "attempted" with score < 50
      status = "attempted"; // Or you might have a separate 'not_started' status
    }

    unitProgress[unitId] = {
      status,
      mcqScore,
      lastPracticed: admin.firestore.FieldValue.serverTimestamp(),
    };

    await doc.ref.update({
      unitProgress,
      lastStudied: admin.firestore.FieldValue.serverTimestamp(), // Update lastStudied for the whole subject
    });

    const updated = await doc.ref.get();
    return { id: updated.id, ...updated.data() };
  }

  async getUnitProgress(
    userId: string,
    subjectId: string
  ): Promise<any> {
    const db = getDb(); // Assuming getDb() is available and returns a Firestore instance
    const subjectsRef = db.collection("user_subjects");

    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      // Return empty object if subject not found, or null depending on desired behavior
      return {};
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    // Ensure unitProgress exists and is an object, otherwise return empty object
    return data.unitProgress && typeof data.unitProgress === 'object' ? data.unitProgress : {};
  }
}

export const storage = new Storage();