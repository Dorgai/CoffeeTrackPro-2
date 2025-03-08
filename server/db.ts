import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { scrypt } from "crypto";
import { promisify } from "util";
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Seed initial data if needed
export async function seedInitialData() {
  try {
    console.log("Starting initial data seeding...");

    // Check if we already have shops
    const existingShops = await db.select().from(schema.shops);
    if (existingShops.length === 0) {
      console.log("No shops found, creating initial shops...");
      await db.insert(schema.shops).values([
        {
          name: "Main Roastery",
          location: "123 Coffee Street",
          desiredSmallBags: 20,
          desiredLargeBags: 10,
          isActive: true
        },
        {
          name: "Downtown Shop",
          location: "456 Main Street",
          desiredSmallBags: 15,
          desiredLargeBags: 8,
          isActive: true
        }
      ]);
      console.log("Initial shops created successfully");
    }

    // Check if we have a roastery owner
    const existingOwner = await db.select().from(schema.users)
      .where(eq(schema.users.role, "roasteryOwner"));

    if (existingOwner.length === 0) {
      console.log("No roastery owner found, creating initial owner...");
      await db.insert(schema.users).values({
        username: "owner",
        password: await hashPassword("password123"),
        role: "roasteryOwner",
        isActive: true,
        isPendingApproval: false,
      });
      console.log("Initial roastery owner created successfully");
    }

    // Add sample green coffee inventory if none exists
    const existingCoffee = await db.select().from(schema.greenCoffee);
    if (existingCoffee.length === 0) {
      console.log("No green coffee found, creating initial inventory...");
      await db.insert(schema.greenCoffee).values([
        {
          name: "Ethiopian Yirgacheffe",
          producer: "Yirgacheffe Coffee Farmers Cooperative",
          country: "Ethiopia",
          currentStock: 100,
          minThreshold: 20,
          grade: "AA",
          isActive: true
        },
        {
          name: "Colombian Supremo",
          producer: "Federation of Colombian Coffee Growers",
          country: "Colombia",
          currentStock: 150,
          minThreshold: 30,
          grade: "AA",
          isActive: true
        }
      ]);
      console.log("Initial green coffee inventory created successfully");
    }

    console.log("Initial data seeding completed successfully");
  } catch (error) {
    console.error("Error seeding initial data:", error);
    throw error;
  }
}