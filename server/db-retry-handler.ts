import { databaseManager } from "./db";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

/**
 * Provides retry and resilience mechanisms for database operations
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
        if (!isHealthy && attempt === 1) {
          console.warn(
            "Database unhealthy on first attempt, forcing reconnect...",
          );
          await databaseManager.forceReconnect();
        }

        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `Database operation failed (attempt ${attempt}/${maxRetries + 1}):`,
          lastError.message,
        );

        if (attempt > maxRetries) break;

        if (this.isConnectionError(lastError)) {
          console.log("Connection error detected, forcing reconnection...");
          try {
            await databaseManager.forceReconnect();
          } catch (reconnectError) {
            console.error("Reconnection failed:", reconnectError);
          }
        }

        // Backoff with jitter
        const delay =
          backoffMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(delay, 30000)),
        );
      }
    }

    throw lastError || new Error("Database operation failed after retries");
  }

  /**
   * Check whether error looks like a connection issue
   */
  private static isConnectionError(error: Error): boolean {
    const patterns = [
      /connection/i,
      /network/i,
      /timeout/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /socket/i,
      /pool/i,
      /SELF_SIGNED_CERT_IN_CHAIN/i,
      /certificate/i,
    ];
    return patterns.some(
      (pattern) => pattern.test(error.message) || pattern.test(error.name),
    );
  }

  /**
   * Run a transaction with retry logic
   */
  static async withTransaction<T>(
    operation: (tx: NeonDatabase<typeof schema>) => Promise<T>,
    maxRetries = 2,
  ): Promise<T> {
    return this.withRetry(async () => {
      const db = await databaseManager.getDatabase();
      return db.transaction(operation);
    }, maxRetries);
  }

  /**
   * Perform a health check and try recovery if needed
   */
  static async healthCheckWithRecovery(): Promise<boolean> {
    try {
      let isHealthy = await databaseManager.healthCheck();
      if (!isHealthy) {
        console.log("Health check failed, forcing recovery...");
        await databaseManager.forceReconnect();
        isHealthy = await databaseManager.healthCheck();
      }
      return isHealthy;
    } catch (error) {
      console.error("Health check with recovery failed:", error);
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
    throw new Error("Database is not available after recovery attempts");
  }
}
