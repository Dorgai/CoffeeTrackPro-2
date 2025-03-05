import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from "./vite";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Seed initial data if needed
export async function seedInitialData() {
  try {
    log("Checking database connection...");
    await pool.query('SELECT 1');
    log("Database connection successful");

    // Check if we already have shops
    log("Checking for existing shops...");
    const existingShops = await db.select().from(schema.shops);

    if (existingShops.length === 0) {
      log("No shops found, creating initial shop...");
      await db.insert(schema.shops).values({
        name: "Main Roastery",
        location: "123 Coffee Street",
      });
      log("Initial shop created successfully");
    } else {
      log("Shops already exist, skipping initial shop creation");
    }
  } catch (error) {
    log("Error in database initialization:");
    log(error instanceof Error ? error.message : String(error));
    throw error;
  }
}