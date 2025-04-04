import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleMySQL } from 'drizzle-orm/mysql2';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  console.error('Environment variables:', process.env);
  throw new Error('DATABASE_URL is required');
}

if (!process.env.DB_TYPE) {
  throw new Error('DB_TYPE must be either "postgres" or "mysql"');
}

const dbType = process.env.DB_TYPE.toLowerCase();
if (dbType !== 'postgres' && dbType !== 'mysql') {
  throw new Error('DB_TYPE must be either "postgres" or "mysql"');
}

let db: any;
let pool: any;

export async function initializeDatabase() {
  try {
    console.log("Initializing database connection...");
    console.log("Database URL:", process.env.DATABASE_URL?.substring(0, 20) + '...');
    console.log("Node environment:", process.env.NODE_ENV);
    
    // Parse the DATABASE_URL to ensure it's valid
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    
    const url = new URL(databaseUrl);
    console.log("Database host:", url.hostname);
    console.log("Database port:", url.port);
    console.log("Database name:", url.pathname.slice(1));

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Required for Railway's PostgreSQL
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    db = drizzle(pool, { schema });

    // Test the connection with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await db.execute(sql`SELECT 1`);
        console.log("Database connection test successful");
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) throw error;
        console.log(`Connection attempt failed, retrying... (${retries} attempts left)`);
        console.log("Error details:", error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Add error handler for idle clients
    pool.on('error', (err: Error, client: any) => {
      console.error('Unexpected error on idle client', err);
      if (client) {
        client.release(true);
      }
    });

    // Add connect handler
    pool.on('connect', (client: any) => {
      console.log("New client connected to database");
      client.on('error', (err: Error) => {
        console.error('Database client error:', err);
      });
    });

    console.log("Database connection initialized successfully");
  } catch (error: any) {
    console.error("Failed to initialize database connection:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      hint: error.hint
    });
    throw error;
  }
}

export { db, pool };

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