import { databaseManager } from "./db";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

// Database retry mechanism for enhanced reliability
export class DatabaseRetryHandler {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BACKOFF_MS = 1000;

  // Execute database operation with retry logic
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.DEFAULT_MAX_RETRIES,
    backoffMs: number = this.DEFAULT_BACKOFF_MS,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Check database health before executing
        const isHealthy = await databaseManager.healthCheck();
        if (!isHealthy && attempt === 1) {
          console.warn("Database appears unhealthy, attempting reconnection");
          await databaseManager.forceReconnect();
        }

        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(
          `Database operation failed (attempt ${attempt}/${maxRetries + 1}):`,
          lastError.message,
        );

        // Don't retry on the last attempt
        if (attempt > maxRetries) break;

        // Check if this is a connection-related error
        if (this.isConnectionError(lastError)) {
          console.log("Connection error detected, forcing reconnection");
          try {
            await databaseManager.forceReconnect();
          } catch (reconnectError) {
            console.error("Reconnection failed:", reconnectError);
          }
        }

        // Exponential backoff with jitter
        const delay =
          backoffMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(delay, 30000)),
        );
      }
    }

    throw lastError || new Error("Database operation failed after retries");
  }

  // Check if error is connection-related
  private static isConnectionError(error: Error): boolean {
    const connectionErrorPatterns = [
      /connection/i,
      /network/i,
      /timeout/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /socket/i,
      /pool/i,
    ];

    return connectionErrorPatterns.some(
      (pattern) => pattern.test(error.message) || pattern.test(error.name),
    );
  }

  // Execute transaction with retry logic
  static async withTransaction<T>(
    operation: (tx: NeonDatabase<typeof schema>) => Promise<T>,
    maxRetries: number = 2, // Fewer retries for transactions
  ): Promise<T> {
    return this.withRetry(async () => {
      const db = (await databaseManager.getDatabase()) as NeonDatabase<
        typeof schema
      >;
      return db.transaction(operation);
    }, maxRetries);
  }

  // Health check with automatic recovery
  static async healthCheckWithRecovery(): Promise<boolean> {
    try {
      const isHealthy = await databaseManager.healthCheck();

      if (!isHealthy) {
        console.log("Database health check failed, attempting recovery");
        await databaseManager.forceReconnect();

        // Check again after reconnection
        return await databaseManager.healthCheck();
      }

      return true;
    } catch (error) {
      console.error("Health check with recovery failed:", error);
      return false;
    }
  }
}

// Middleware function to ensure database health before operations
export async function ensureDatabaseHealth(): Promise<void> {
  const isHealthy = await DatabaseRetryHandler.healthCheckWithRecovery();
  if (!isHealthy) {
    throw new Error("Database is not available after recovery attempts");
  }
}
