import { getDb, databaseManager } from './db';
import { DatabaseRetryHandler } from './db-retry-handler';
import * as admin from 'firebase-admin'; // Assuming admin is needed for FieldValue
import { maybeUpdateUserGeoStateFromIp } from './user-geo-state';

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
  savedExamState?: any; // Added to store exam state
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
  private db: admin.firestore.Firestore | null = null;

  private async ensureConnection() {
    if (this.db) {
      return;
    }
    if (isDevelopmentMode()) {
      this.db = null; // Explicitly null for dev mode
      return;
    }
    try {
      this.db = getDb();
      if (!this.db) {
        throw new Error("Firestore instance is null or undefined.");
      }
    } catch (error) {
      console.error("Failed to get database instance:", error);
      throw new Error("Could not establish database connection.");
    }
  }

  private getDbInstance() {
    if (isDevelopmentMode()) {
      return null;
    }
    // Ensure connection is established before returning
    if (!this.db) {
      console.warn("Database instance not initialized. Attempting to initialize.");
      // This part might need adjustment depending on how getDb() is managed globally
      // For now, we'll assume ensureConnection() handles it.
      // If getDb() itself throws, ensureConnection will catch it.
      getDb(); // Trigger potential initialization if not already done
      return getDb(); // Return the instance after attempting to get it
    }
    return this.db;
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
      await this.ensureConnection();
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
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");
      const snapshot = await db.collection('waitlist_emails').get();
      return { total: snapshot.size };
    });
  }

  /** Admin-only: aggregate waitlist size and most recent signup (no full list). */
  async getWaitlistAdminSummary(): Promise<{ total: number; latest: string | null }> {
    if (isDevelopmentMode()) {
      const entries = Array.from(devStorage.waitlist_emails.values()).sort(
        (a, b) => b.signedUpAt.getTime() - a.signedUpAt.getTime(),
      );
      return {
        total: devStorage.waitlist_emails.size,
        latest: entries[0]?.email ?? null,
      };
    }

    return DatabaseRetryHandler.withRetry(async () => {
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");
      const col = db.collection("waitlist_emails");
      const totalSnap = await col.count().get();
      const total = totalSnap.data().count ?? 0;
      let latest: string | null = null;
      try {
        const recent = await col.orderBy("signedUpAt", "desc").limit(1).get();
        if (!recent.empty) {
          const em = recent.docs[0].data()?.email;
          latest = typeof em === "string" ? em : null;
        }
      } catch {
        // Missing index or field: still return total
      }
      return { total, latest };
    });
  }

  async createUser(firebaseUid: string, email: string, username?: string, clientIp?: string | null): Promise<User> {
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
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const usersRef = db.collection('users');

      // Use firebaseUid as doc ID to align with profile API format
      const docRef = usersRef.doc(firebaseUid);
      const existing = await docRef.get();
      if (existing.exists) {
        const data = existing.data();
        return {
          id: firebaseUid,
          firebaseUid,
          email: data?.email ?? email,
          username: data?.displayName ?? username ?? firebaseUid,
          createdAt: data?.createdAt ? new Date(data.createdAt) : new Date(),
        } as User;
      }

      const user: Omit<User, 'id'> & { firebaseUid: string } = {
        firebaseUid,
        email,
        username,
        createdAt: new Date(),
      };

      await docRef.set(user);

      await maybeUpdateUserGeoStateFromIp(db, firebaseUid, clientIp ?? null).catch(() => undefined);

      return {
        id: firebaseUid,
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
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const usersRef = db.collection('users');

      // First check: users created by profile API use doc ID = firebaseUid
      const profileDoc = await usersRef.doc(firebaseUid).get();
      if (profileDoc.exists) {
        const data = profileDoc.data();
        return {
          id: firebaseUid,
          firebaseUid,
          email: data?.email ?? `${firebaseUid}@firebase.user`,
          username: data?.displayName ?? firebaseUid,
          createdAt: data?.createdAt ? new Date(data.createdAt) : new Date(),
        } as User;
      }

      // Second check: users created by storage have firebaseUid field
      const snapshot = await usersRef.where('firebaseUid', '==', firebaseUid).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        } as User;
      }

      return null;
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
      await this.ensureConnection();
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
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const docRef = db.collection('user_subjects').doc();
      const subjectData: Omit<UserSubject, 'id'> & { createdAt?: Date } = {
        ...subject,
        dateAdded: now,
        unitProgress: {}, // Initialize unitProgress
        createdAt: now, // For admin insights enrollment-over-time series
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
      await this.ensureConnection();
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
      await this.ensureConnection();
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
      await this.ensureConnection();
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
      await this.ensureConnection();
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

  /**
   * Ensures a user_subjects document exists for the given userId and subjectId.
   * If none exists, creates a minimal document so unit progress and unit quiz results can be saved.
   * Returns the document reference (Firestore) or null (dev mode).
   */
  async ensureUserSubject(
    userId: string,
    subjectId: string
  ): Promise<admin.firestore.DocumentReference | null> {
    if (isDevelopmentMode()) {
      return null;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const subjectsRef = db.collection("user_subjects");
      const snapshot = await subjectsRef
        .where("userId", "==", userId)
        .where("subjectId", "==", subjectId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].ref;
      }

      const now = new Date();
      const docRef = subjectsRef.doc();
      const minimalSubject: Omit<UserSubject, "id"> & { createdAt?: Date } = {
        userId,
        subjectId,
        name: subjectId,
        description: "",
        units: 0,
        difficulty: "",
        examDate: "",
        progress: 0,
        masteryLevel: 0,
        dateAdded: now,
        unitProgress: {},
        createdAt: now,
      };
      await docRef.set(minimalSubject);
      return docRef;
    });
  }

  async updateSubjectMasteryLevel(
    userId: string,
    subjectId: string,
    masteryLevel: number
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

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
    mcqScore: number,
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    await this.ensureUserSubject(userId, subjectId);

    const subjectsRef = db.collection("user_subjects");

    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      console.error("[storage.updateUnitProgress] Subject not found after ensureUserSubject", {
        userId,
        subjectId,
      });
      throw new Error("Subject not found");
    }

    const doc = snapshot.docs[0];
    const unitProgress = doc.data().unitProgress || {};
    const currentUnit = unitProgress[unitId] || {
      status: "not-started",
      highestScore: 0,
      scores: [],
    };

    // Add new score to history - use regular Date instead of serverTimestamp in arrays
    const newScore = {
      score: mcqScore,
      date: new Date(), // Changed from serverTimestamp()
    };

    const scores = currentUnit.scores || [];
    scores.push(newScore);

    // Calculate highest score
    const highestScore = Math.max(mcqScore, currentUnit.highestScore || 0);

    // Determine status based on highest score using the updated calculateUnitStatus logic
    const status = calculateUnitStatus(highestScore);

    const unitProgressUpdate = {
      status: status,
      mcqScore: highestScore, // Store highest score as current mcqScore for simplicity, or could keep separate
      highestScore,
      scores,
      lastPracticed: admin.firestore.FieldValue.serverTimestamp(),
    };

    unitProgress[unitId] = unitProgressUpdate;

    try {
      await doc.ref.update({
        unitProgress,
        lastStudied: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updated = await doc.ref.get();
      const updatedData = { id: updated.id, ...updated.data() };

      return updatedData;
    } catch (firestoreError) {
      console.error("❌ [updateUnitProgress] Firestore update failed:", firestoreError);
      throw firestoreError;
    }
  }

  async getUnitProgress(
    userId: string,
    subjectId: string
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

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


  async saveFullLengthTest(
    userId: string,
    subjectId: string,
    score: number,
    percentage: number,
    totalQuestions: number,
    questions: any[],
    userAnswers: { [key: number]: string }
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const testId = `test_${Date.now()}`;
    const timestamp = new Date();

    // Calculate section breakdown
    const sectionBreakdown: { [key: string]: { name: string; unitNumber: number; correct: number; total: number; percentage: number } } = {};
    const sectionInfo: Record<string, { name: string; unitNumber: number }> = {
      // AP Macroeconomics
      "BEC": { name: "Basic Economic Concepts", unitNumber: 1 },
      "EIBC": { name: "Economic Indicators & Business Cycle", unitNumber: 2 },
      "NIPD": { name: "National Income & Price Determination", unitNumber: 3 },
      "FS": { name: "Financial Sector", unitNumber: 4 },
      "LRCSP": { name: "Long-Run Consequences of Stabilization Policies", unitNumber: 5 },
      "OEITF": { name: "Open Economy - International Trade & Finance", unitNumber: 6 },
      // AP Microeconomics
      "SD": { name: "Supply and Demand", unitNumber: 2 },
      "PC": { name: "Production, Cost, and Perfect Competition", unitNumber: 3 },
      "IMP": { name: "Imperfect Competition", unitNumber: 4 },
      "FM": { name: "Factor Markets", unitNumber: 5 },
      "MF": { name: "Market Failure and the Role of Government", unitNumber: 6 },
      // AP Computer Science Principles
      "CRD": { name: "Creative Development", unitNumber: 1 },
      "DAT": { name: "Data", unitNumber: 2 },
      "AAP": { name: "Algorithms and Programming", unitNumber: 3 },
      "CSN": { name: "Computer Systems and Networks", unitNumber: 4 },
      "IOC": { name: "Impact of Computing", unitNumber: 5 },
    };

    questions.forEach((q, idx) => {
      const sectionCode = q.section_code || "Unknown";
      const info = sectionInfo[sectionCode] || { name: sectionCode, unitNumber: 0 };

      if (!sectionBreakdown[sectionCode]) {
        sectionBreakdown[sectionCode] = {
          name: info.name,
          unitNumber: info.unitNumber,
          correct: 0,
          total: 0,
          percentage: 0
        };
      }

      sectionBreakdown[sectionCode].total++;

      const userAnswer = userAnswers[idx];
      const correctAnswerLabel = String.fromCharCode(65 + q.answerIndex);
      if (userAnswer === correctAnswerLabel) {
        sectionBreakdown[sectionCode].correct++;
      }
    });

    // Calculate percentages
    Object.values(sectionBreakdown).forEach(section => {
      section.percentage = Math.round((section.correct / section.total) * 100);
    });

    const testData = {
      id: testId,
      date: timestamp,
      score,
      percentage,
      totalQuestions,
      questions,
      userAnswers,
      sectionBreakdown
    };

    // Find the user_subjects document
    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const unitProgress = data.unitProgress || {};

      // Update the full-length unit progress with history
      unitProgress["full-length"] = {
        mcqScore: percentage,
        lastUpdated: timestamp,
        history: [...(unitProgress["full-length"]?.history || []), {
          id: testId,
          date: timestamp,
          score,
          percentage,
          totalQuestions
        }]
      };

      await doc.ref.update({
        unitProgress,
        lastStudied: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Save complete test data in a subcollection
      await doc.ref.collection("fullLengthTests").doc(testId).set(testData);
    }

    return testData;
  }

  async getFullLengthTestResult(
    userId: string,
    subjectId: string,
    testId: string
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const testDoc = await doc.ref.collection("fullLengthTests").doc(testId).get();

    if (!testDoc.exists) {
      return null;
    }

    return testDoc.data();
  }

  async getAllFullLengthTests(userId: string, subjectId?: string): Promise<any[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    let query: admin.firestore.Query = subjectsRef.where("userId", "==", userId);
    
    if (subjectId) {
      query = query.where("subjectId", "==", subjectId);
    }

    const snapshot = await query.get();
    const allTests: any[] = [];

    for (const doc of snapshot.docs) {
      const testsSnapshot = await doc.ref.collection("fullLengthTests").orderBy("date", "asc").get();
      testsSnapshot.docs.forEach(testDoc => {
        const testData = testDoc.data();
        allTests.push({
          ...testData,
          subjectId: doc.data().subjectId
        });
      });
    }

    allTests.sort((a, b) => a.date.toMillis() - b.date.toMillis());
    return allTests;
  }

  async saveDiagnosticTest(
    userId: string,
    subjectId: string,
    score: number,
    percentage: number,
    totalQuestions: number,
    questions: any[],
    userAnswers: { [key: number]: string },
    sectionBreakdown: { [key: string]: { name: string; unitNumber: number; correct: number; total: number; percentage: number } },
    projectedScore: number
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const testId = `diag_${Date.now()}`;
    const timestamp = new Date();

    const testData = {
      id: testId,
      type: "diagnostic",
      date: timestamp,
      score,
      percentage,
      totalQuestions,
      questions,
      userAnswers,
      sectionBreakdown,
      projectedScore,
    };

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const unitProgress = data.unitProgress || {};

      // Update per-unit highest score from diagnostic sectionBreakdown
      Object.entries(sectionBreakdown).forEach(([sectionCode, section]) => {
        const existing = unitProgress[sectionCode] || { status: "not-started", highestScore: 0, scores: [] };
        const newHighest = Math.max(section.percentage, existing.highestScore || 0);
        unitProgress[sectionCode] = {
          ...existing,
          mcqScore: newHighest,
          highestScore: newHighest,
          status: calculateUnitStatus(newHighest),
          lastPracticed: admin.firestore.FieldValue.serverTimestamp(),
        };
      });

      await doc.ref.update({
        unitProgress,
        lastStudied: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Store diagnostic in its own subcollection
      await doc.ref.collection("diagnosticTests").doc(testId).set(testData);

      // Also clear any in-progress diagnostic state
      await doc.ref.update({
        diagnosticProgress: admin.firestore.FieldValue.delete(),
      });
    }

    return testData;
  }

  async getAllDiagnosticTests(userId: string, subjectId?: string): Promise<any[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    let query: admin.firestore.Query = subjectsRef.where("userId", "==", userId);
    if (subjectId) {
      query = query.where("subjectId", "==", subjectId);
    }

    const snapshot = await query.get();
    const allTests: any[] = [];

    for (const doc of snapshot.docs) {
      const testsSnapshot = await doc.ref.collection("diagnosticTests").orderBy("date", "asc").get();
      testsSnapshot.docs.forEach((testDoc) => {
        allTests.push({
          ...testDoc.data(),
          subjectId: doc.data().subjectId,
          type: "diagnostic",
        });
      });
    }

    allTests.sort((a, b) => {
      const aMs = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
      const bMs = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
      return aMs - bMs;
    });
    return allTests;
  }

  async getDiagnosticTestResult(
    userId: string,
    subjectId: string,
    testId: string
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const testDoc = await doc.ref.collection("diagnosticTests").doc(testId).get();

    if (!testDoc.exists) {
      return null;
    }

    return testDoc.data();
  }

  async saveUnitQuizResult(
    userId: string,
    subjectId: string,
    payload: {
      unitId: string;
      sectionCode: string;
      score: number;
      percentage: number;
      totalQuestions: number;
      sectionName?: string;
      unitNumber?: number;
      userAnswers?: { [key: string]: string };
      questions?: any[];
    }
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const docId = `unit_${payload.sectionCode}_${Date.now()}`;
    const timestamp = new Date();

    const sectionBreakdown: { [key: string]: { name: string; unitNumber: number; correct: number; total: number; percentage: number } } = {};
    sectionBreakdown[payload.sectionCode] = {
      name: payload.sectionName || payload.sectionCode,
      unitNumber: payload.unitNumber ?? 0,
      correct: payload.score,
      total: payload.totalQuestions,
      percentage: payload.percentage,
    };

    const testData: Record<string, any> = {
      id: docId,
      type: "unit",
      date: timestamp,
      score: payload.score,
      percentage: payload.percentage,
      totalQuestions: payload.totalQuestions,
      subjectId,
      unitId: payload.unitId,
      sectionCode: payload.sectionCode,
      sectionBreakdown,
    };
    if (payload.userAnswers != null && typeof payload.userAnswers === "object") {
      testData.userAnswers = payload.userAnswers;
    }
    if (payload.questions != null && Array.isArray(payload.questions)) {
      testData.questions = payload.questions;
    }

    await this.ensureUserSubject(userId, subjectId);

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.collection("unitQuizResults").doc(docId).set(testData);
    } else {
      console.error("[storage.saveUnitQuizResult] No user_subjects doc found after ensureUserSubject", {
        userId,
        subjectId,
      });
    }

    return testData;
  }

  async getAllUnitQuizResults(userId: string, subjectId?: string): Promise<any[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    let query: admin.firestore.Query = subjectsRef.where("userId", "==", userId);
    if (subjectId) {
      query = query.where("subjectId", "==", subjectId);
    }

    const snapshot = await query.get();
    const allResults: any[] = [];

    for (const doc of snapshot.docs) {
      const resultsSnapshot = await doc.ref.collection("unitQuizResults").orderBy("date", "asc").get();
      resultsSnapshot.docs.forEach((resultDoc) => {
        allResults.push({
          ...resultDoc.data(),
          subjectId: doc.data().subjectId,
          type: "unit",
        });
      });
    }

    allResults.sort((a, b) => {
      const aMs = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
      const bMs = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
      return aMs - bMs;
    });
    return allResults;
  }

  async getUnitQuizResult(
    userId: string,
    subjectId: string,
    testId: string
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const testDoc = await doc.ref.collection("unitQuizResults").doc(testId).get();

    if (!testDoc.exists) {
      return null;
    }

    return testDoc.data();
  }

  async saveDiagnosticProgress(
    userId: string,
    subjectId: string,
    progress: {
      questionIndex: number;
      userAnswers: { [key: number]: string };
      unitDifficultyState: { [sectionCode: string]: string };
      questions: any[];
    }
  ): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        diagnosticProgress: {
          ...progress,
          savedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }
  }

  async getDiagnosticProgress(userId: string, subjectId: string): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data().diagnosticProgress || null;
  }

  async clearDiagnosticProgress(userId: string, subjectId: string): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        diagnosticProgress: admin.firestore.FieldValue.delete(),
      });
    }
  }

  async saveExamState(
    userId: string,
    subjectId: string,
    examState: any
  ): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      await doc.ref.update({
        savedExamState: {
          ...examState,
          savedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }
  }

  async getExamState(
    userId: string,
    subjectId: string
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return data.savedExamState || null;
  }

  async deleteExamState(
    userId: string,
    subjectId: string
  ): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      await doc.ref.update({
        savedExamState: admin.firestore.FieldValue.delete(),
      });
    }
  }

  async saveUnitQuizState(
    userId: string,
    subjectId: string,
    unitId: string,
    state: { questionIds: string[]; currentQuestionIndex: number; userAnswers: { [key: number]: string }; flaggedQuestions?: number[]; timeElapsed?: number }
  ): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const savedUnitQuizState = data.savedUnitQuizState || {};
      savedUnitQuizState[unitId] = {
        ...state,
        savedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await doc.ref.update({ savedUnitQuizState });
    }
  }

  async getUnitQuizState(
    userId: string,
    subjectId: string,
    unitId: string
  ): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    const savedUnitQuizState = data.savedUnitQuizState || {};
    return savedUnitQuizState[unitId] || null;
  }

  async deleteUnitQuizState(
    userId: string,
    subjectId: string,
    unitId: string
  ): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");
    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      await doc.ref.update({
        [`savedUnitQuizState.${unitId}`]: admin.firestore.FieldValue.delete(),
      });
    }
  }

  async getSectionReviewData(userId: string, subjectId: string, testId: string, sectionCode: string): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const testData = await this.getFullLengthTestResult(userId, subjectId, testId);

    if (!testData) {
      return null;
    }

    // Filter questions by section
    const sectionQuestions = testData.questions.filter((q: any) => q.section_code === sectionCode);

    // Filter user answers to match section question indices
    const sectionUserAnswers: { [key: number]: string } = {};
    let sectionQuestionIndex = 0;

    testData.questions.forEach((q: any, idx: number) => {
      if (q.section_code === sectionCode) {
        sectionUserAnswers[sectionQuestionIndex] = testData.userAnswers[idx];
        sectionQuestionIndex++;
      }
    });

    return {
      questions: sectionQuestions,
      userAnswers: sectionUserAnswers
    };
  }

  async toggleBookmark(
    userId: string,
    questionData: {
      questionId: string;
      subjectId: string;
      unitId: string;
      prompt: string;
      choices: string[];
      answerIndex: number;
      explanation: string;
      sectionCode?: string;
    }
  ): Promise<{ bookmarked: boolean }> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const bookmarksRef = db.collection('user_bookmarks');
    const existing = await bookmarksRef
      .where('userId', '==', userId)
      .where('questionId', '==', questionData.questionId)
      .limit(1)
      .get();

    if (!existing.empty) {
      await existing.docs[0].ref.delete();
      return { bookmarked: false };
    }

    await bookmarksRef.add({
      userId,
      ...questionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { bookmarked: true };
  }

  async getBookmarks(userId: string, subjectId?: string, unitId?: string): Promise<any[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    let query: admin.firestore.Query = db.collection('user_bookmarks')
      .where('userId', '==', userId);

    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }

    const snapshot = await query.get();
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (unitId) {
      results = results.filter((item: any) => item.unitId === unitId);
    }
    results.sort((a: any, b: any) => {
      const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    return results;
  }

  async isBookmarked(userId: string, questionId: string): Promise<boolean> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const snapshot = await db.collection('user_bookmarks')
      .where('userId', '==', userId)
      .where('questionId', '==', questionId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  async getBookmarkedQuestionIds(userId: string, subjectId?: string): Promise<string[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    let query: admin.firestore.Query = db.collection('user_bookmarks')
      .where('userId', '==', userId);

    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data().questionId);
  }

  async trackQuestionPerformance(
    userId: string,
    data: {
      questionId: string;
      subjectId: string;
      unitId: string;
      correct: boolean;
      timeSpentSec: number;
      sectionCode?: string;
      prompt?: string;
      choices?: string[];
      answerIndex?: number;
      explanation?: string;
    }
  ): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const stateRef = db.collection('user_question_state');
    const existing = await stateRef
      .where('userId', '==', userId)
      .where('questionId', '==', data.questionId)
      .limit(1)
      .get();

    const now = new Date();
    const intervalMs = data.correct
      ? this.getNextInterval(0, true) * 24 * 60 * 60 * 1000
      : 10 * 60 * 1000;
    const nextReview = new Date(now.getTime() + intervalMs);

    if (existing.empty) {
      const docData: any = {
        userId,
        questionId: data.questionId,
        subjectId: data.subjectId,
        unitId: data.unitId,
        sectionCode: data.sectionCode || '',
        incorrectCount: data.correct ? 0 : 1,
        correctCount: data.correct ? 1 : 0,
        streak: data.correct ? 1 : 0,
        lastAnsweredAt: now,
        lastResult: data.correct ? 'correct' : 'incorrect',
        needsReview: !data.correct,
        nextReviewAt: nextReview,
        totalTimeSpentSec: data.timeSpentSec,
        attemptCount: 1,
      };
      if (data.prompt) docData.prompt = data.prompt;
      if (data.choices) docData.choices = data.choices;
      if (data.answerIndex !== undefined) docData.answerIndex = data.answerIndex;
      if (data.explanation) docData.explanation = data.explanation;
      await stateRef.add(docData);
    } else {
      const doc = existing.docs[0];
      const prev = doc.data();
      const newStreak = data.correct ? (prev.streak || 0) + 1 : 0;
      const newIntervalMs = data.correct
        ? this.getNextInterval(newStreak, true) * 24 * 60 * 60 * 1000
        : 10 * 60 * 1000;
      const newNextReview = new Date(now.getTime() + newIntervalMs);

      const updateData: any = {
        incorrectCount: (prev.incorrectCount || 0) + (data.correct ? 0 : 1),
        correctCount: (prev.correctCount || 0) + (data.correct ? 1 : 0),
        streak: newStreak,
        lastAnsweredAt: now,
        lastResult: data.correct ? 'correct' : 'incorrect',
        nextReviewAt: newNextReview,
        totalTimeSpentSec: (prev.totalTimeSpentSec || 0) + data.timeSpentSec,
        attemptCount: (prev.attemptCount || 0) + 1,
      };
      if (!data.correct) {
        updateData.needsReview = true;
      } else {
        updateData.needsReview = false;
      }
      if (data.prompt != null) updateData.prompt = data.prompt;
      if (data.choices != null) updateData.choices = data.choices;
      if (data.answerIndex !== undefined) updateData.answerIndex = data.answerIndex;
      if (data.explanation != null) updateData.explanation = data.explanation;
      await doc.ref.update(updateData);
    }
  }

  private getNextInterval(streak: number, correct: boolean): number {
    if (!correct) return 1;
    const intervals = [1, 3, 7, 14, 30, 60];
    return intervals[Math.min(streak, intervals.length - 1)];
  }

  async getDueReviews(userId: string, subjectId?: string, limit: number = 20, unitId?: string): Promise<any[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    let query: admin.firestore.Query = db.collection('user_question_state')
      .where('userId', '==', userId);

    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }

    const snapshot = await query.get();
    let results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((doc: any) => doc.needsReview === true || (doc.needsReview === undefined && doc.lastResult === 'incorrect'));

    if (unitId) {
      results = results.filter((doc: any) => doc.unitId === unitId);
    }

    results = results
      .sort((a: any, b: any) => {
        const aTime = a.lastAnsweredAt?.toDate ? a.lastAnsweredAt.toDate().getTime() : 0;
        const bTime = b.lastAnsweredAt?.toDate ? b.lastAnsweredAt.toDate().getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
    return results;
  }

  async removeFromReview(userId: string, questionId: string): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const snapshot = await db.collection('user_question_state')
      .where('userId', '==', userId)
      .where('questionId', '==', questionId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({ needsReview: false });
    }
  }

  async restoreToReview(userId: string, questionId: string): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const snapshot = await db.collection('user_question_state')
      .where('userId', '==', userId)
      .where('questionId', '==', questionId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({ needsReview: true });
    }
  }

  async getQuestionStats(userId: string, subjectId?: string): Promise<any> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    let query: admin.firestore.Query = db.collection('user_question_state')
      .where('userId', '==', userId);

    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }

    const snapshot = await query.get();
    const allDocs = snapshot.docs.map(doc => doc.data());
    const stats = {
      totalAttempted: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalTimeSpentSec: 0,
      dueForReview: 0,
      accuracy: 0,
      byUnit: {} as { [unitId: string]: { correct: number; incorrect: number; total: number; avgTimeSec: number } },
    };

    allDocs.forEach(data => {
      stats.totalAttempted += data.attemptCount || 0;
      stats.totalCorrect += data.correctCount || 0;
      stats.totalIncorrect += data.incorrectCount || 0;
      stats.totalTimeSpentSec += data.totalTimeSpentSec || 0;

      if (data.needsReview === true || (data.needsReview === undefined && data.lastResult === 'incorrect')) {
        stats.dueForReview++;
      }

      const unitId = data.unitId || 'unknown';
      if (!stats.byUnit[unitId]) {
        stats.byUnit[unitId] = { correct: 0, incorrect: 0, total: 0, avgTimeSec: 0 };
      }
      stats.byUnit[unitId].correct += data.correctCount || 0;
      stats.byUnit[unitId].incorrect += data.incorrectCount || 0;
      stats.byUnit[unitId].total += data.attemptCount || 0;
      stats.byUnit[unitId].avgTimeSec = stats.byUnit[unitId].total > 0
        ? (stats.byUnit[unitId].avgTimeSec * (stats.byUnit[unitId].total - (data.attemptCount || 0)) + (data.totalTimeSpentSec || 0)) / stats.byUnit[unitId].total
        : 0;
    });

    const sorted = [...allDocs].sort((a, b) => {
      const aTime = a.lastAnsweredAt?.toDate ? a.lastAnsweredAt.toDate().getTime() : (a.lastAnsweredAt instanceof Date ? a.lastAnsweredAt.getTime() : 0);
      const bTime = b.lastAnsweredAt?.toDate ? b.lastAnsweredAt.toDate().getTime() : (b.lastAnsweredAt instanceof Date ? b.lastAnsweredAt.getTime() : 0);
      return bTime - aTime;
    });
    const last50 = sorted.slice(0, 50);
    const last50Correct = last50.filter(s => s.lastResult === 'correct').length;
    stats.accuracy = last50.length > 0 ? Math.round((last50Correct / last50.length) * 100) : 0;

    return stats;
  }

  async saveScoreSnapshot(userId: string, subjectId: string, accuracy: number, predictedScore: number, totalAttempted: number): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const milestone = Math.floor(totalAttempted / 25) * 25;
    if (milestone < 25) return;

    const docId = `${userId}_${subjectId}_m${milestone}`;
    const existing = await db.collection('score_history').doc(docId).get();
    if (existing.exists) return;

    await db.collection('score_history').doc(docId).set({
      userId,
      subjectId,
      date: admin.firestore.Timestamp.fromDate(now),
      dateKey,
      accuracy,
      predictedScore,
      totalAttempted: milestone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async backfillScoreSnapshots(userId: string, subjectId: string, currentAccuracy: number, currentPredicted: number, totalAttempted: number): Promise<void> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    for (let m = 25; m <= totalAttempted; m += 25) {
      const docId = `${userId}_${subjectId}_m${m}`;
      const existing = await db.collection('score_history').doc(docId).get();
      if (!existing.exists) {
        await db.collection('score_history').doc(docId).set({
          userId,
          subjectId,
          date: admin.firestore.Timestamp.fromDate(now),
          dateKey,
          accuracy: currentAccuracy,
          predictedScore: currentPredicted,
          totalAttempted: m,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  async getScoreHistory(userId: string, subjectId?: string): Promise<any[]> {
    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    let query: admin.firestore.Query = db.collection('score_history')
      .where('userId', '==', userId);

    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }

    const snapshot = await query.get();
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        date: data.dateKey,
        accuracy: data.accuracy,
        predictedScore: data.predictedScore,
        totalAttempted: data.totalAttempted,
      };
    });

    results.sort((a, b) => a.totalAttempted - b.totalAttempted);
    return results;
  }

  async createQuestionReport(report: Omit<QuestionReport, 'id' | 'status' | 'createdAt'>): Promise<QuestionReport> {
    if (isDevelopmentMode()) {
      const id = `dev-report-${Date.now()}`;
      const newReport: QuestionReport = {
        id,
        ...report,
        status: 'pending',
        createdAt: new Date(),
      };
      // In-memory storage for reports if needed, but for now just return it
      return newReport;
    }

    return DatabaseRetryHandler.withRetry(async () => {
      await this.ensureConnection();
      const db = this.getDbInstance();
      if (!db) throw new Error("Firestore not available");

      const docRef = db.collection('question_reports').doc();
      const newReportData = {
        ...report,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await docRef.set(newReportData);
      const doc = await docRef.get();
      
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data()?.createdAt as admin.firestore.Timestamp)?.toDate() || new Date(),
      } as QuestionReport;
    });
  }
}

export const storage = new Storage();

export function calculateUnitStatus(mcqScore: number): string {
  if (mcqScore >= 80) return "mastered";
  if (mcqScore >= 60) return "proficient";
  if (mcqScore > 0) return "attempted";
  return "not-started";
}