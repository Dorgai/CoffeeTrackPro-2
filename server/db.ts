import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure websocket for Neon serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize the connection pool with conservative settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout for connection
  max: 10, // Reduce max connections to prevent overloading
  idleTimeoutMillis: 60000, // 1 minute idle timeout
  allowExitOnIdle: false // Keep the pool alive
});

// Create the drizzle db instance
export const db = drizzle(pool, { schema });

// Initialize database and test connection
export async function initializeDatabase() {
  try {
    console.log("Testing database connection...");

    // Test query to verify connection and get database info
    const result = await pool.query('SELECT current_database(), current_user, version();');
    console.log("Database connection test successful:", {
      database: result.rows[0].current_database,
      user: result.rows[0].current_user,
      version: result.rows[0].version
    });

    // Add error handler for idle clients
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(1);
    });

    console.log("Database connection initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    throw error;
  }
}