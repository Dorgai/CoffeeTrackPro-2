import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize the connection pool with better configuration
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the drizzle db instance
export const db = drizzle(pool, { schema });

// Initialize database and test connection
export async function initializeDatabase() {
  try {
    console.log("Testing database connection...");

    // Test a simple query
    await pool.query('SELECT 1');

    // Add error handler for idle clients
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      // Don't exit the process, just log the error and remove the client
      if (client) {
        client.release(true); // Release with error
      }
    });

    // Add connect handler
    pool.on('connect', (client) => {
      console.log("New client connected to database");
      client.on('error', (err) => {
        console.error('Database client error:', err);
      });
    });

    console.log("Database connection initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    throw error;
  }
}

// Add cleanup function for graceful shutdown
export async function cleanupDatabase() {
  try {
    console.log("Cleaning up database connections...");
    await pool.end();
    console.log("Database connections closed");
  } catch (error) {
    console.error("Error during database cleanup:", error);
    throw error;
  }
}