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

// Initialize the connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000 // 5 second timeout
});

// Create the drizzle db instance
export const db = drizzle(pool, { schema });

// Initialize database and test connection
export async function initializeDatabase() {
  try {
    console.log("Testing database connection...");

    // Test a simple query
    await pool.query('SELECT 1');

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