import { type RoastingBatch, type InsertRoastingBatch, roastingBatches, users, type User, type Shop, type InsertShop, shops, userShops, type GreenCoffee, greenCoffee } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    this.initializeTestData();
  }

  private async initializeTestData() {
    try {
      // Check if we have any active shops
      const existingShops = await db.select().from(shops).where(eq(shops.isActive, true));

      if (existingShops.length === 0) {
        console.log("Creating test shops...");
        const testShops = [
          {
            name: "Main Roastery",
            location: "123 Coffee Street",
            isActive: true,
            desiredSmallBags: 20,
            desiredLargeBags: 10,
          },
          {
            name: "Downtown Cafe",
            location: "456 Main Street",
            isActive: true,
            desiredSmallBags: 15,
            desiredLargeBags: 8,
          },
          {
            name: "Airport Location",
            location: "789 Terminal Ave",
            isActive: true,
            desiredSmallBags: 25,
            desiredLargeBags: 12,
          }
        ];

        for (const shop of testShops) {
          await this.createShop(shop);
          console.log(`Created shop: ${shop.name}`);
        }
      }
    } catch (error) {
      console.error("Error initializing test data:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values(user)
        .returning();
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Shop operations
  async getShop(id: number): Promise<Shop | undefined> {
    try {
      const [shop] = await db
        .select()
        .from(shops)
        .where(and(eq(shops.id, id), eq(shops.isActive, true)));
      return shop;
    } catch (error) {
      console.error("Error getting shop:", error);
      return undefined;
    }
  }

  async getShops(): Promise<Shop[]> {
    try {
      console.log("Getting all active shops");
      const allShops = await db
        .select()
        .from(shops)
        .where(eq(shops.isActive, true))
        .orderBy(shops.name);
      console.log("Found active shops:", allShops);
      return allShops;
    } catch (error) {
      console.error("Error getting shops:", error);
      return [];
    }
  }

  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      console.log("Getting shops for user:", userId);

      // First get the user to check their role
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      console.log("User role:", user?.role);

      // For roasteryOwner and owner roles, return all active shops
      if (user?.role === "roasteryOwner" || user?.role === "owner") {
        return this.getShops();
      }

      // For other roles, get assigned shops
      const userShopsData = await db
        .select({
          id: shops.id,
          name: shops.name,
          location: shops.location,
          isActive: shops.isActive,
          desiredSmallBags: shops.desiredSmallBags,
          desiredLargeBags: shops.desiredLargeBags,
          createdAt: shops.createdAt
        })
        .from(userShops)
        .innerJoin(shops, eq(userShops.shopId, shops.id))
        .where(and(
          eq(userShops.userId, userId),
          eq(shops.isActive, true)
        ));

      console.log("Found user assigned shops:", userShopsData);
      return userShopsData;
    } catch (error) {
      console.error("Error getting user shops:", error);
      return [];
    }
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    try {
      const [newShop] = await db
        .insert(shops)
        .values(shop)
        .returning();
      return newShop;
    } catch (error) {
      console.error("Error creating shop:", error);
      throw error;
    }
  }

  async updateShop(id: number, data: Partial<InsertShop>): Promise<Shop> {
    try {
      const [updatedShop] = await db
        .update(shops)
        .set(data)
        .where(eq(shops.id, id))
        .returning();
      return updatedShop;
    } catch (error) {
      console.error("Error updating shop:", error);
      throw error;
    }
  }

  async deleteShop(id: number): Promise<Shop> {
    try {
      const [deletedShop] = await db
        .update(shops)
        .set({ isActive: false })
        .where(eq(shops.id, id))
        .returning();
      return deletedShop;
    } catch (error) {
      console.error("Error deleting shop:", error);
      throw error;
    }
  }

  // Roasting batch methods
  async getRoastingBatches(): Promise<RoastingBatch[]> {
    try {
      const batches = await db
        .select()
        .from(roastingBatches)
        .orderBy(roastingBatches.createdAt);
      return batches;
    } catch (error) {
      console.error("Error getting roasting batches:", error);
      return [];
    }
  }

  async createRoastingBatch(data: InsertRoastingBatch): Promise<RoastingBatch> {
    try {
      const [batch] = await db
        .insert(roastingBatches)
        .values(data)
        .returning();
      return batch;
    } catch (error) {
      console.error("Error creating roasting batch:", error);
      throw error;
    }
  }

  async updateRoastingBatch(id: number, data: Partial<InsertRoastingBatch>): Promise<RoastingBatch> {
    try {
      const [batch] = await db
        .update(roastingBatches)
        .set(data)
        .where(eq(roastingBatches.id, id))
        .returning();
      return batch;
    } catch (error) {
      console.error("Error updating roasting batch:", error);
      throw error;
    }
  }

  // Green coffee methods
  async getGreenCoffees(): Promise<GreenCoffee[]> {
    try {
      return await db.select().from(greenCoffee);
    } catch (error) {
      console.error("Error getting green coffees:", error);
      return [];
    }
  }

  async getGreenCoffee(id: number): Promise<GreenCoffee | undefined> {
    try {
      const [coffee] = await db
        .select()
        .from(greenCoffee)
        .where(eq(greenCoffee.id, id));
      return coffee;
    } catch (error) {
      console.error("Error getting green coffee:", error);
      return undefined;
    }
  }

  async updateGreenCoffeeStock(id: number, data: { currentStock: string }): Promise<GreenCoffee | undefined> {
    try {
      const [coffee] = await db
        .update(greenCoffee)
        .set(data)
        .where(eq(greenCoffee.id, id))
        .returning();
      return coffee;
    } catch (error) {
      console.error("Error updating green coffee stock:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();