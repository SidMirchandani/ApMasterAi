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
  savedExamState?: any; // Added to store exam state
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
      await this.ensureConnection();
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
      await this.ensureConnection();
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
      await this.ensureConnection();
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
    console.log("📝 [updateUnitProgress] Starting with:", { userId, subjectId, unitId, mcqScore });

    await this.ensureConnection();
    const db = this.getDbInstance();
    if (!db) throw new Error("Firestore not available");

    const subjectsRef = db.collection("user_subjects");

    const snapshot = await subjectsRef
      .where("userId", "==", userId)
      .where("subjectId", "==", subjectId)
      .get();

    console.log("📊 [updateUnitProgress] Query result:", {
      empty: snapshot.empty,
      size: snapshot.size
    });

    if (snapshot.empty) {
      throw new Error("Subject not found");
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const unitProgress = data.unitProgress || {};
    const currentUnit = unitProgress[unitId] || { scores: [], highestScore: 0 };

    console.log("📖 [updateUnitProgress] Current unit data:", {
      unitId,
      currentScores: currentUnit.scores?.length || 0,
      currentHighestScore: currentUnit.highestScore || 0
    });

    console.log("📥 [updateUnitProgress] Current unit data before update:", {
      currentUnit,
      existingScores: currentUnit.scores?.length || 0,
      existingHighestScore: currentUnit.highestScore
    });

    // Add new score to history - use regular Date instead of serverTimestamp in arrays
    const newScore = {
      score: mcqScore,
      date: new Date(), // Changed from serverTimestamp()
    };

    const scores = currentUnit.scores || [];
    scores.push(newScore);

    console.log("📊 [updateUnitProgress] Score history updated:", {
      newScore,
      totalScores: scores.length,
      allScores: scores.map(s => s.score)
    });

    // Calculate highest score
    const highestScore = Math.max(mcqScore, currentUnit.highestScore || 0);

    // Determine status based on highest score using the updated calculateUnitStatus logic
    const status = calculateUnitStatus(highestScore);

    console.log("🎯 [updateUnitProgress] Calculated status:", {
      mcqScore,
      highestScore,
      status: status,
      totalScores: scores.length,
      statusCalculation: `highestScore=${highestScore} -> status=${status}`
    });

    const unitProgressUpdate = {
      status: status,
      mcqScore: highestScore, // Store highest score as current mcqScore for simplicity, or could keep separate
      highestScore,
      scores,
      lastPracticed: admin.firestore.FieldValue.serverTimestamp(),
    };

    unitProgress[unitId] = unitProgressUpdate;

    console.log("💾 [updateUnitProgress] Updating Firestore with:", {
      unitId,
      unitProgressUpdate,
      allUnitIds: Object.keys(unitProgress)
    });

    try {
      await doc.ref.update({
        unitProgress,
        lastStudied: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ [updateUnitProgress] Firestore update successful");

      const updated = await doc.ref.get();
      const updatedData = { id: updated.id, ...updated.data() };
      
      console.log("✅ [updateUnitProgress] Update successful, returning:", {
        id: updatedData.id,
        subjectId: updatedData.subjectId,
        unitProgressKeys: Object.keys(updatedData.unitProgress || {})
      });

      return updatedData;
    } catch (firestoreError) {
      console.error("❌ [updateUnitProgress] Firestore update failed:", firestoreError);
      throw firestoreError;
    }ted.data() };
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

}

export const storage = new Storage();

export function calculateUnitStatus(mcqScore: number): string {
  if (mcqScore >= 80) return "mastered";
  if (mcqScore >= 60) return "proficient";
  if (mcqScore > 0) return "attempted";
  return "not-started";
}