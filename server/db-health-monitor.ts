import { databaseManager } from "./db";

// Database health check utility (serverless-safe)
export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  private constructor() {}

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  /**
   * Run a health check, recover if necessary.
   * Call this inside your API handlers before DB ops.
   */
  async ensureHealthy(): Promise<void> {
    try {
      const isHealthy = await databaseManager.healthCheck();

      if (!isHealthy) {
        this.consecutiveFailures++;
        console.warn(
          `[DB Health] Check failed (${this.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES})`,
        );

        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          await databaseManager.forceReconnect();
          this.consecutiveFailures = 0;
        }
      } else {
        this.consecutiveFailures = 0;
      }
    } catch (error) {
      console.error("[DB Health] Error during health check:", error);
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        await databaseManager.forceReconnect();
        this.consecutiveFailures = 0;
      }
    }
  }

  /**
   * Get current status (for debugging / metrics).
   */
  async getStatus(): Promise<{
    isHealthy: boolean;
    consecutiveFailures: number;
  }> {
    const isHealthy = await databaseManager.healthCheck();
    return { isHealthy, consecutiveFailures: this.consecutiveFailures };
  }
}

export const databaseHealthMonitor = DatabaseHealthMonitor.getInstance();
