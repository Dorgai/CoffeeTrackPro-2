import { type User, type Shop, type InsertUser, type InsertShop, users, shops } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { log } from "./vite";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    log("Initializing database storage...");
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    log("Database storage initialized successfully");
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

  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      return await db
        .select()
        .from(shops)
        .where(eq(shops.isActive, true))
        .orderBy(shops.name);
    } catch (error) {
      console.error("Error getting user shops:", error);
      throw error;
    }
  }

  // Permission checking
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user || !user.isActive) return false;

      const role = user.role;

      // Roastery owners have full access
      if (role === "roasteryOwner") {
        return true;
      }

      // Basic permissions for other roles
      if (role === "retailOwner") {
        return ["retail.read", "retail.write"].includes(permission);
      }

      return false;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();