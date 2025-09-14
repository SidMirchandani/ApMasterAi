import { databaseManager } from "./db";

// Database health monitoring for Replit environments
export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private isMonitoring = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  private constructor() {}

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  // Start monitoring database health
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Database health monitoring already running');
      return;
    }

    console.log('Starting database health monitoring');
    this.isMonitoring = true;
    this.consecutiveFailures = 0;

    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.CHECK_INTERVAL_MS);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('Stopping database health monitoring');
    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Perform health check
  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = await databaseManager.healthCheck();
      
      if (isHealthy) {
        if (this.consecutiveFailures > 0) {
          console.log('Database health restored after', this.consecutiveFailures, 'failures');
        }
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
        console.warn(`Database health check failed (${this.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES})`);
        
        // Attempt recovery if we've had too many failures
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.log('Max consecutive failures reached, attempting recovery');
          await this.attemptRecovery();
        }
      }
    } catch (error) {
      this.consecutiveFailures++;
      console.error('Health check error:', error);
      
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        await this.attemptRecovery();
      }
    }
  }

  // Attempt to recover database connection
  private async attemptRecovery(): Promise<void> {
    try {
      console.log('Attempting database recovery');
      await databaseManager.forceReconnect();
      
      // Test the connection after recovery
      const isHealthy = await databaseManager.healthCheck();
      if (isHealthy) {
        console.log('Database recovery successful');
        this.consecutiveFailures = 0;
      } else {
        console.error('Database recovery failed');
      }
    } catch (error) {
      console.error('Database recovery attempt failed:', error);
    }
  }

  // Get current health status
  async getCurrentHealthStatus(): Promise<{
    isHealthy: boolean;
    consecutiveFailures: number;
    isMonitoring: boolean;
  }> {
    const isHealthy = await databaseManager.healthCheck();
    
    return {
      isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      isMonitoring: this.isMonitoring
    };
  }

  // Force a health check and recovery if needed
  async forceHealthCheck(): Promise<boolean> {
    await this.performHealthCheck();
    return await databaseManager.healthCheck();
  }
}

// Auto-start monitoring when module loads
const healthMonitor = DatabaseHealthMonitor.getInstance();

// Start monitoring after a brief delay to allow database initialization
setTimeout(() => {
  healthMonitor.startMonitoring();
}, 5000); // 5 seconds

// Export for manual control
export { healthMonitor as databaseHealthMonitor };

// Graceful shutdown
process.on('SIGINT', () => {
  healthMonitor.stopMonitoring();
});

process.on('SIGTERM', () => {
  healthMonitor.stopMonitoring();
});