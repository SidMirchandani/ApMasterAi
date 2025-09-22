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
      const firebaseAdmin = getFirebaseAdmin();
      
      if (!firebaseAdmin) {
        console.warn("Firebase Admin not available - database operations will be limited in development");
        this.db = null;
        return;
      }
      
      const { app } = firebaseAdmin;
      this.db = getFirestore(app);
      console.log("Firestore connection established.");
    } catch (error) {
      console.error("Failed to initialize Firestore connection:", error);
      
      // In development, don't throw - just log and continue
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
      
      if (isDevelopment || isReplit) {
        console.warn("Continuing without Firestore in development mode");
        this.db = null;
        return;
      }
      
      throw error;
    }
  }

  getDatabase(): FirebaseFirestore.Firestore | null {
    if (!this.db) {
      this.initializeConnection();
    }
    return this.db;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        console.log("Database not initialized, attempting to initialize...");
        this.initializeConnection();
        if (!this.db) return false;
      }
      
      // Simple health check - try to access Firestore
      console.log("Performing Firestore health check...");
      
      // Check if we're in development mode and handle accordingly
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        // In development, we might be using emulators or have connectivity issues
        // Try a simple operation with a shorter timeout
        const healthRef = this.db.collection('_health').doc('test');
        await healthRef.set({ timestamp: new Date(), status: 'ok' }, { merge: true });
        console.log("Firestore health check passed (development mode)");
        return true;
      } else {
        // Production health check
        await this.db.collection('_health').limit(1).get();
        console.log("Firestore health check passed");
        return true;
      }
    } catch (error) {
      console.error("Firestore health check failed:", error);
      
      // In development, we might want to continue without Firestore for testing
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.warn("Development mode: Continuing without Firestore connection");
        // You might want to return true here if you want to continue without DB in dev
        return false;
      }
      
      return false;
    }
  }
}

// Singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Compatibility exports
export const getDb = () => {
  const db = databaseManager.getDatabase();
  if (!db) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
    
    if (isDevelopment || isReplit) {
      console.warn("Firestore is not available in development mode - using fallback storage");
      return null;
    }
    
    throw new Error("Firestore is not available");
  }
  return db;
};