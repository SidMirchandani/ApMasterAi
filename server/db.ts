import { Pool, neonConfig, PoolConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Enhanced Neon configuration for Replit environments
neonConfig.webSocketConstructor = ws;

// Configure for better reliability in Replit
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false; // Disable for better Replit compatibility
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration for Replit reliability
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings for stability
  max: 10, // Maximum connections
  min: 2,  // Minimum connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
  // Retry configuration
  maxUses: 7500, // Maximum uses per connection
  keepAlive: true,
  // Enhanced error handling
  log: (msg, level) => {
    if (level === 'error') {
      console.error('Database pool error:', msg);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('Database pool:', level, msg);
    }
  }
};

class ReplitDatabaseManager {
  private static instance: ReplitDatabaseManager;
  private pool: Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private isReconnecting = false;

  private constructor() {
    // Don't call initializeConnection in constructor to avoid sync issues
  }

  static getInstance(): ReplitDatabaseManager {
    if (!ReplitDatabaseManager.instance) {
      ReplitDatabaseManager.instance = new ReplitDatabaseManager();
      // Initialize connection asynchronously
      ReplitDatabaseManager.instance.initializeConnection().catch(error => {
        console.error('Failed to initialize database during getInstance:', error);
      });
    }
    return ReplitDatabaseManager.instance;
  }

  private async initializeConnection(): Promise<void> {
    try {
      console.log('Initializing database connection for Replit environment');
      
      // Create pool with enhanced configuration
      this.pool = new Pool(poolConfig);
      
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      // Initialize Drizzle with the pool
      this.db = drizzle({ client: this.pool, schema });
      
      console.log('Database connection established successfully');
      this.reconnectAttempts = 0;
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      await this.handleConnectionError(error);
    }
  }

  private setupConnectionMonitoring(): void {
    if (!this.pool) return;

    // Monitor pool events
    this.pool.on('error', async (err) => {
      console.error('Database pool error:', err);
      await this.handleConnectionError(err);
    });

    this.pool.on('connect', () => {
      console.log('New database connection established');
    });

    this.pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }

  private async handleConnectionError(error: any): Promise<void> {
    if (this.isReconnecting) return;
    
    console.error('Database connection error:', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      
      console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      // Wait with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      try {
        await this.closeConnection();
        await this.initializeConnection();
      } catch (reconnectError) {
        console.error('Reconnection failed:', reconnectError);
      } finally {
        this.isReconnecting = false;
      }
    } else {
      console.error('Max reconnection attempts reached. Manual intervention required.');
    }
  }

  async closeConnection(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.db = null;
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }

  async getDatabase(): Promise<ReturnType<typeof drizzle>> {
    if (!this.db) {
      console.log('Database not ready, attempting initialization...');
      await this.initializeConnection();
      if (!this.db) {
        throw new Error('Database initialization failed.');
      }
    }
    return this.db;
  }

  async getPool(): Promise<Pool> {
    if (!this.pool) {
      console.log('Pool not ready, attempting initialization...');
      await this.initializeConnection();
      if (!this.pool) {
        throw new Error('Database pool initialization failed.');
      }
    }
    return this.pool;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Force reconnection (useful for new tab scenarios)
  async forceReconnect(): Promise<void> {
    console.log('Forcing database reconnection');
    this.reconnectAttempts = 0;
    await this.closeConnection();
    await this.initializeConnection();
  }
}

// Initialize the database manager
const dbManager = ReplitDatabaseManager.getInstance();

// Create lazy-loaded exports that initialize on first access
let poolPromise: Promise<Pool> | null = null;
let dbPromise: Promise<ReturnType<typeof drizzle>> | null = null;

export const getPool = (): Promise<Pool> => {
  if (!poolPromise) {
    poolPromise = dbManager.getPool();
  }
  return poolPromise;
};

export const getDb = (): Promise<ReturnType<typeof drizzle>> => {
  if (!dbPromise) {
    dbPromise = dbManager.getDatabase();
  }
  return dbPromise;
};

// Legacy exports for backward compatibility - these will initialize synchronously if possible
export const pool = new Proxy({} as Pool, {
  get: (target, prop) => {
    throw new Error('Use getPool() instead for async pool access');
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (target, prop) => {
    throw new Error('Use getDb() instead for async database access');
  }
});

export { dbManager as databaseManager };

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await dbManager.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await dbManager.closeConnection();
  process.exit(0);
});
