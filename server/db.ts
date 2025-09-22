import { Pool, neonConfig, PoolConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// Neon configuration for serverless Postgres
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.fetchConnectionCache = true;

// Fix for Replit SSL certificate issues
if (process.env.REPLIT_DEPLOYMENT) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connection pool configuration
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  maxUses: 7_500,
  keepAlive: true,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  log: (msg, level) => {
    if (level === "error") {
      console.error("Database pool error:", msg);
    } else if (process.env.NODE_ENV === "development") {
      console.log("Database pool:", level, msg);
    }
  },
};

class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;
  private db: NeonDatabase<typeof schema> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private isReconnecting = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
      DatabaseManager.instance.initializeConnection().catch((err) => {
        console.error("Failed to initialize database:", err);
      });
    }
    return DatabaseManager.instance;
  }

  private async initializeConnection(): Promise<void> {
    try {
      console.log("Initializing database connection...");
      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

      this.db = drizzle(this.pool, { schema });
      this.reconnectAttempts = 0;
      this.setupConnectionMonitoring();

      console.log("Database connection established.");
    } catch (error) {
      console.error("Failed to initialize database connection:", error);
      await this.handleConnectionError(error);
    }
  }

  private setupConnectionMonitoring(): void {
    if (!this.pool) return;
    this.pool.on("error", async (err) => {
      console.error("Database pool error:", err);
      await this.handleConnectionError(err);
    });
  }

  private async handleConnectionError(error: unknown): Promise<void> {
    if (this.isReconnecting) return;

    console.error("Database connection error:", error);
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;

      const backoffMs = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts - 1),
        30_000,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));

      try {
        await this.closeConnection();
        await this.initializeConnection();
      } finally {
        this.isReconnecting = false;
      }
    } else {
      console.error("Max reconnection attempts reached.");
    }
  }

  async closeConnection(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      console.log("Database connection closed");
    }
  }

  async getDatabase(): Promise<NeonDatabase<typeof schema>> {
    if (!this.db) {
      await this.initializeConnection();
      if (!this.db) throw new Error("Database initialization failed.");
    }
    return this.db;
  }

  getPool(): Pool | null {
    return this.pool;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  async forceReconnect(): Promise<void> {
    console.log("Forcing database reconnection...");
    this.reconnectAttempts = 0;
    await this.closeConnection();
    await this.initializeConnection();
  }
}

// Singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Compatibility exports
export const getDb = async () => databaseManager.getDatabase();
export const getPool = () => databaseManager.getPool();
