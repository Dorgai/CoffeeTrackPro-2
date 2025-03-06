import { type User, type Shop, type InsertUser, type InsertShop, users, shops, userShops } from "@shared/schema";
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
        .where(eq(shops.id, id));
      return shop;
    } catch (error) {
      console.error("Error getting shop:", error);
      return undefined;
    }
  }

  async getShops(): Promise<Shop[]> {
    try {
      console.log("Getting all shops");
      const allShops = await db
        .select()
        .from(shops)
        .where(eq(shops.isActive, true))
        .orderBy(shops.name);
      console.log("Found shops:", allShops);
      return allShops;
    } catch (error) {
      console.error("Error getting shops:", error);
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

  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      console.log("Getting shops for user:", userId);

      // First get the user to check their role
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      console.log("User role:", user?.role);

      // For roasteryOwner, return all active shops
      if (user?.role === "roasteryOwner") {
        return this.getShops();
      }

      // For other roles, get assigned shops
      const shops = await db
        .select()
        .from(userShops)
        .innerJoin(shops, eq(userShops.shopId, shops.id))
        .where(and(
          eq(userShops.userId, userId),
          eq(shops.isActive, true)
        ));

      console.log("Found user shops:", shops);
      return shops.map(({ shops: shop }) => shop);
    } catch (error) {
      console.error("Error getting user shops:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();