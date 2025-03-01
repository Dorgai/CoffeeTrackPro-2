import {
  type User,
  type Shop,
  type GreenCoffee,
  type RoastingBatch,
  type RetailInventory,
  type Order,
  type InsertUser,
  type InsertShop,
  type InsertGreenCoffee,
  type InsertRoastingBatch,
  type InsertRetailInventory,
  type InsertOrder,
  users,
  shops,
  greenCoffee,
  roastingBatches,
  retailInventory,
  orders,
  userShops,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Shops
  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  getUserShops(userId: number): Promise<Shop[]>; // Added method

  // Green Coffee
  getGreenCoffee(id: number): Promise<GreenCoffee | undefined>;
  getGreenCoffees(): Promise<GreenCoffee[]>;
  createGreenCoffee(coffee: InsertGreenCoffee): Promise<GreenCoffee>;
  updateGreenCoffeeStock(id: number, amount: number): Promise<GreenCoffee>;

  // Roasting
  getRoastingBatch(id: number): Promise<RoastingBatch | undefined>;
  getRoastingBatches(): Promise<RoastingBatch[]>;
  createRoastingBatch(batch: InsertRoastingBatch): Promise<RoastingBatch>;

  // Retail Inventory  
  getRetailInventory(id: number): Promise<RetailInventory | undefined>;
  getRetailInventoriesByShop(shopId: number): Promise<RetailInventory[]>;
  updateRetailInventory(inventory: InsertRetailInventory): Promise<RetailInventory>;

  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByShop(shopId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(
    id: number,
    update: {
      status: Order["status"];
      smallBags: number;
      largeBags: number;
      updatedById: number;
    }
  ): Promise<Order>;
  // Add new method to interface
  getRetailInventoryHistory(shopId: number): Promise<(RetailInventory & { 
    greenCoffeeName: string; 
    updatedByUsername: string;
  })[]>;
  getAllRetailInventories(): Promise<(RetailInventory & {
    shop: Shop;
    greenCoffee: GreenCoffee;
    updatedBy: User;
  })[]>;

  getAllOrders(): Promise<(Order & {
    shop: Shop;
    greenCoffee: GreenCoffee;
    user: User;
    updatedBy: User | null;
  })[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values([user]).returning();
    return newUser;
  }

  // Shops
  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async getShops(): Promise<Shop[]> {
    return await db.select().from(shops);
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const [newShop] = await db.insert(shops).values(shop).returning();
    return newShop;
  }

  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      const result = await db
        .select({
          id: shops.id,
          name: shops.name,
          location: shops.location,
        })
        .from(shops)
        .innerJoin(userShops, eq(shops.id, userShops.shopId))
        .where(eq(userShops.userId, userId));

      return result;
    } catch (error) {
      console.error("Error fetching user shops:", error);
      throw error;
    }
  }

  // Green Coffee
  async getGreenCoffee(id: number): Promise<GreenCoffee | undefined> {
    const [coffee] = await db.select().from(greenCoffee).where(eq(greenCoffee.id, id));
    return coffee;
  }

  async getGreenCoffees(): Promise<GreenCoffee[]> {
    return await db.select().from(greenCoffee);
  }

  async createGreenCoffee(coffee: InsertGreenCoffee): Promise<GreenCoffee> {
    const [newCoffee] = await db.insert(greenCoffee).values(coffee).returning();
    return newCoffee;
  }

  async updateGreenCoffeeStock(id: number, amount: number): Promise<GreenCoffee> {
    const [coffee] = await db
      .update(greenCoffee)
      .set({ currentStock: amount.toString() })
      .where(eq(greenCoffee.id, id))
      .returning();
    return coffee;
  }

  // Roasting
  async getRoastingBatch(id: number): Promise<RoastingBatch | undefined> {
    const [batch] = await db.select().from(roastingBatches).where(eq(roastingBatches.id, id));
    return batch;
  }

  async getRoastingBatches(): Promise<RoastingBatch[]> {
    return await db.select().from(roastingBatches);
  }

  async createRoastingBatch(batch: InsertRoastingBatch): Promise<RoastingBatch> {
    try {
      const [newBatch] = await db
        .insert(roastingBatches)
        .values({
          ...batch,
          greenCoffeeAmount: batch.greenCoffeeAmount.toString(),
          roastedAmount: batch.roastedAmount.toString(),
          roastingLoss: batch.roastingLoss.toString(),
        })
        .returning();
      return newBatch;
    } catch (error) {
      console.error("Error creating roasting batch:", error);
      throw error;
    }
  }

  // Retail Inventory
  async getRetailInventory(id: number): Promise<RetailInventory | undefined> {
    const [inv] = await db.select().from(retailInventory).where(eq(retailInventory.id, id));
    return inv;
  }

  async getRetailInventoriesByShop(shopId: number): Promise<RetailInventory[]> {
    return await db
      .select()
      .from(retailInventory)
      .where(eq(retailInventory.shopId, shopId));
  }

  async updateRetailInventory(inventory: InsertRetailInventory): Promise<RetailInventory> {
    console.log("Updating retail inventory with data:", inventory);

    try {
      // First try to find existing inventory
      const existingInventory = await db
        .select()
        .from(retailInventory)
        .where(
          eq(retailInventory.shopId, inventory.shopId),
          eq(retailInventory.greenCoffeeId, inventory.greenCoffeeId)
        )
        .limit(1);

      console.log("Found existing inventory:", existingInventory);

      if (existingInventory.length > 0) {
        // Update existing inventory
        const [updatedInventory] = await db
          .update(retailInventory)
          .set({
            smallBags: inventory.smallBags,
            largeBags: inventory.largeBags,
            updatedById: inventory.updatedById,
            updatedAt: new Date(),
          })
          .where(eq(retailInventory.id, existingInventory[0].id))
          .returning();

        console.log("Updated existing inventory:", updatedInventory);
        return updatedInventory;
      } else {
        // Create new inventory entry
        const [newInventory] = await db
          .insert(retailInventory)
          .values({
            shopId: inventory.shopId,
            greenCoffeeId: inventory.greenCoffeeId,
            smallBags: inventory.smallBags,
            largeBags: inventory.largeBags,
            updatedById: inventory.updatedById,
            updatedAt: new Date(),
          })
          .returning();

        console.log("Created new inventory:", newInventory);
        return newInventory;
      }
    } catch (error) {
      console.error("Error in updateRetailInventory:", error);
      throw error;
    }
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByShop(shopId: number): Promise<Order[]> {
    try {
      const results = await db
        .select({
          id: orders.id,
          shopId: orders.shopId,
          greenCoffeeId: orders.greenCoffeeId,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
          status: orders.status,
          createdAt: orders.createdAt,
          createdById: orders.createdById,
          user: {
            id: users.id,
            username: users.username,
            role: users.role
          }
        })
        .from(orders)
        .where(eq(orders.shopId, shopId))
        .leftJoin(users, eq(orders.createdById, users.id))
        .orderBy(desc(orders.createdAt));

      console.log("Found orders for shop:", results);
      return results;
    } catch (error) {
      console.error("Error getting orders:", error);
      throw error;
    }
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(
    id: number,
    update: {
      status: Order["status"];
      smallBags: number;
      largeBags: number;
      updatedById: number;
    }
  ): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: update.status,
        smallBags: update.smallBags,
        largeBags: update.largeBags,
        updatedById: update.updatedById,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
  async getRetailInventoryHistory(shopId: number): Promise<(RetailInventory & { 
    greenCoffeeName: string;
    updatedByUsername: string;
  })[]> {
    try {
      // Get date 12 months ago
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const result = await db
        .select({
          id: retailInventory.id,
          shopId: retailInventory.shopId,
          greenCoffeeId: retailInventory.greenCoffeeId,
          smallBags: retailInventory.smallBags,
          largeBags: retailInventory.largeBags,
          updatedAt: retailInventory.updatedAt,
          updatedById: retailInventory.updatedById,
          greenCoffeeName: greenCoffee.name,
          updatedByUsername: users.username,
        })
        .from(retailInventory)
        .innerJoin(greenCoffee, eq(retailInventory.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(retailInventory.updatedById, users.id))
        .where(
          eq(retailInventory.shopId, shopId),
          gt(retailInventory.updatedAt, twelveMonthsAgo)
        )
        .orderBy(desc(retailInventory.updatedAt));

      return result;
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      throw error;
    }
  }
  async getAllRetailInventories(): Promise<(RetailInventory & {
    shop: Shop;
    greenCoffee: GreenCoffee;
    updatedBy: User;
  })[]> {
    try {
      const result = await db
        .select({
          id: retailInventory.id,
          shopId: retailInventory.shopId,
          greenCoffeeId: retailInventory.greenCoffeeId,
          smallBags: retailInventory.smallBags,
          largeBags: retailInventory.largeBags,
          updatedAt: retailInventory.updatedAt,
          updatedById: retailInventory.updatedById,
          shop: shops,
          greenCoffee: greenCoffee,
          updatedBy: users,
        })
        .from(retailInventory)
        .innerJoin(shops, eq(retailInventory.shopId, shops.id))
        .innerJoin(greenCoffee, eq(retailInventory.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(retailInventory.updatedById, users.id))
        .orderBy(desc(retailInventory.updatedAt));

      return result;
    } catch (error) {
      console.error("Error fetching all retail inventories:", error);
      throw error;
    }
  }

  async getAllOrders(): Promise<(Order & {
    shop: Shop;
    greenCoffee: GreenCoffee;
    user: User;
    updatedBy: User | null;
  })[]> {
    try {
      console.log("Executing getAllOrders query");
      const result = await db
        .select({
          id: orders.id,
          shopId: orders.shopId,
          greenCoffeeId: orders.greenCoffeeId,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
          status: orders.status,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          createdById: orders.createdById,
          updatedById: orders.updatedById,
          shop: {
            id: shops.id,
            name: shops.name,
            location: shops.location,
          },
          greenCoffee: {
            id: greenCoffee.id,
            name: greenCoffee.name,
            producer: greenCoffee.producer,
          },
          user: {
            id: users.id,
            username: users.username,
            role: users.role,
          },
          updatedBy: {
            id: users2.id,
            username: users2.username,
            role: users2.role,
          },
        })
        .from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id))
        .innerJoin(greenCoffee, eq(orders.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(orders.createdById, users.id))
        .leftJoin(users, eq(orders.updatedById, users.id), "users2")
        .orderBy(desc(orders.createdAt));

      console.log("getAllOrders query successful, found orders:", result);
      return result;
    } catch (error) {
      console.error("Error in getAllOrders:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();