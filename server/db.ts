import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleMySQL } from 'drizzle-orm/mysql2';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
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
  if (dbType === 'postgres') {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    db = drizzle(pool, { schema });
  } else {
    // MySQL connection
    pool = await mysql.createPool(process.env.DATABASE_URL);
    db = drizzleMySQL(pool, { schema, mode: 'default' });
  }

  try {
    console.log("Testing database connection...");

    // Test a simple query
    await db.execute(sql`SELECT 1`);

    if (dbType === 'postgres') {
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
    }

    console.log("Database connection initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
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