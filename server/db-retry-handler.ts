
import { databaseManager } from "./db";
import type { FirebaseFirestore } from 'firebase-admin/firestore';

/**
 * Provides retry and resilience mechanisms for Firestore operations
 */
export class DatabaseRetryHandler {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BACKOFF_MS = 1000;

  /**
   * Run an operation with retry logic and exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = this.DEFAULT_MAX_RETRIES,
    backoffMs = this.DEFAULT_BACKOFF_MS,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Ensure DB health before executing
        const isHealthy = await databaseManager.healthCheck();
        if (!isHealthy) {
          throw new Error("Firestore is not available");
        }

        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `Firestore operation failed (attempt ${attempt}/${maxRetries + 1}):`,
          lastError.message,
        );

        if (attempt > maxRetries) break;

        // Backoff with jitter
        const delay =
          backoffMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(delay, 30000)),
        );
      }
    }

    throw lastError || new Error("Firestore operation failed after retries");
  }

  /**
   * Run a transaction with retry logic
   */
  static async withTransaction<T>(
    operation: (db: FirebaseFirestore.Firestore) => Promise<T>,
    maxRetries = 2,
  ): Promise<T> {
    return this.withRetry(async () => {
      const db = databaseManager.getDatabase();
      return db.runTransaction(async (transaction) => {
        // Pass the db instance to the operation for transaction operations
        return operation(db);
      });
    }, maxRetries);
  }

  /**
   * Perform a health check
   */
  static async healthCheckWithRecovery(): Promise<boolean> {
    try {
      return await databaseManager.healthCheck();
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }
}

/**
 * Middleware helper to enforce DB health
 */
export async function ensureDatabaseHealth(): Promise<void> {
  const isHealthy = await DatabaseRetryHandler.healthCheckWithRecovery();
  if (!isHealthy) {
    throw new Error("Firestore is not available");
  }
}
