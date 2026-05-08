import { getFirebaseAdmin } from "./firebase-admin";
import { hasServiceAccountFileOrKey } from "./firebase-service-account";
import { getFirestore } from "firebase-admin/firestore";

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: FirebaseFirestore.Firestore | null = null;
  /** When true, do not call initializeConnection again (e.g. dev without service account). */
  private firestoreUnavailable = false;

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
        console.warn(
          "Firebase Admin not available - database operations will be limited in development",
        );
        this.db = null;
        return;
      }

      /**
       * Without explicit GCP credentials, Firestore's client can be created but the first RPC fails
       * with "Could not load the default credentials" on typical local setups.
       * Skip Firestore in development so APIs can use JWT/in-memory fallbacks.
       * Set FIREBASE_SERVICE_ACCOUNT_KEY, FIREBASE_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS for real Firestore locally.
       */
      const hasExplicitGcpCreds = hasServiceAccountFileOrKey();
      const devWithoutFirestoreCreds =
        process.env.NODE_ENV === "development" && !hasExplicitGcpCreds;
      if (devWithoutFirestoreCreds) {
        console.warn(
          "[db] No Firebase service account env in development — Firestore disabled (JWT/in-memory fallbacks).",
        );
        this.db = null;
        this.firestoreUnavailable = true;
        return;
      }

      const { app } = firebaseAdmin;
      this.db = getFirestore(app);
    } catch (error) {
      console.error("Failed to initialize Firestore connection:", error);
      throw error;
    }
  }

  getDatabase(): FirebaseFirestore.Firestore | null {
    if (!this.db && !this.firestoreUnavailable) {
      this.initializeConnection();
    }
    return this.db;
  }

  /**
   * Force a reconnect to Firestore, used by health monitors after repeated failures.
   */
  async forceReconnect(): Promise<void> {
    console.warn("Forcing Firestore reconnect...");
    this.db = null;
    this.firestoreUnavailable = false;
    this.initializeConnection();
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        this.initializeConnection();
        if (!this.db) return false;
      }
      // Perform health check
      await this.db.collection("_health").limit(1).get();
      return true;
    } catch (error) {
      console.error("Firestore health check failed:", error);
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
    throw new Error("Firestore is not available");
  }
  return db;
};

/** Firestore handle or null when unavailable (no throw). Use for graceful degradation in API routes. */
export function tryGetDb(): FirebaseFirestore.Firestore | null {
  try {
    return databaseManager.getDatabase();
  } catch {
    return null;
  }
}
