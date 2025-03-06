import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { scrypt } from "crypto";
import { promisify } from "util";
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Seed initial data if needed
export async function seedInitialData() {
  try {
    // Check if we already have shops
    const existingShops = await db.select().from(schema.shops);
    if (existingShops.length === 0) {
      // Create initial shops
      await db.insert(schema.shops).values([
        {
          name: "Main Roastery",
          location: "123 Coffee Street",
          desiredSmallBags: 20,
          desiredLargeBags: 10,
        },
        {
          name: "Downtown Shop",
          location: "456 Main Street",
          desiredSmallBags: 15,
          desiredLargeBags: 8,
        }
      ]);
    }

    // Check if we have a roastery owner
    const existingOwner = await db.select().from(schema.users)
      .where(eq(schema.users.role, "roasteryOwner"));

    if (existingOwner.length === 0) {
      // Create initial roastery owner
      await db.insert(schema.users).values({
        username: "owner",
        password: await hashPassword("password123"),
        role: "roasteryOwner",
        isActive: true,
        isPendingApproval: false,
      });
    }

    // Add sample green coffee inventory if none exists
    const existingCoffee = await db.select().from(schema.greenCoffee);
    if (existingCoffee.length === 0) {
      await db.insert(schema.greenCoffee).values([
        {
          name: "Ethiopian Yirgacheffe",
          producer: "Yirgacheffe Coffee Farmers Cooperative",
          country: "Ethiopia",
          currentStock: 100,
          minThreshold: 20,
          grade: "AA",
        },
        {
          name: "Colombian Supremo",
          producer: "Federation of Colombian Coffee Growers",
          country: "Colombia",
          currentStock: 150,
          minThreshold: 30,
          grade: "AA",
        }
      ]);
    }
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
}