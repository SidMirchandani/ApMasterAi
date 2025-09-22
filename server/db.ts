import { getFirebaseAdmin } from './firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: FirebaseFirestore.Firestore | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
      DatabaseManager.instance.initializeConnection();
    }
    return DatabaseManager.instance;
  }

  private initializeConnection(): void {
    try {
      const { app } = getFirebaseAdmin();
      this.db = getFirestore(app);
      console.log("Firestore connection established.");
    } catch (error) {
      console.error("Failed to initialize Firestore connection:", error);
      throw error;
    }
  }

  getDatabase(): FirebaseFirestore.Firestore {
    if (!this.db) {
      this.initializeConnection();
      if (!this.db) throw new Error("Firestore initialization failed.");
    }
    return this.db;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      // Simple health check - try to access Firestore
      await this.db.collection('_health').limit(1).get();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Compatibility exports
export const getDb = () => databaseManager.getDatabase();