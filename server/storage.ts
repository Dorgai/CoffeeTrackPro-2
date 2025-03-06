import { type RoastingBatch, type InsertRoastingBatch, roastingBatches, users, type User, type Shop, type InsertShop, shops, userShops, type GreenCoffee, type InsertGreenCoffee, greenCoffee, type Order, type InsertOrder, orders } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sql } from 'drizzle-orm';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
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

  async getAllUsers(): Promise<User[]> {
    try {
      console.log("Fetching all users from database");
      // First get all users
      const allUsers = await db
        .select()
        .from(users)
        .orderBy(users.username);

      console.log("Found users:", allUsers.length);

      // Then get their shop assignments
      for (const user of allUsers) {
        const userShopData = await db
          .select({
            shopId: userShops.shopId,
            shopName: shops.name
          })
          .from(userShops)
          .leftJoin(shops, eq(userShops.shopId, shops.id))
          .where(eq(userShops.userId, user.id));

        console.log(`Found ${userShopData.length} shops for user ${user.username}`);
      }

      return allUsers;
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error; // Let the route handler catch and format the error
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    try {
      console.log("Updating user:", id, "with data:", data);

      // Validate role if it's being updated
      if (data.role && !["owner", "roasteryOwner", "roaster", "shopManager", "barista"].includes(data.role)) {
        throw new Error("Invalid role specified");
      }

      const [user] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();

      console.log("Updated user:", user);
      return user;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async assignUserToShop(userId: number, shopId: number): Promise<void> {
    try {
      await db
        .insert(userShops)
        .values({ userId, shopId })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Error assigning user to shop:", error);
      throw error;
    }
  }

  async removeUserFromShop(userId: number, shopId: number): Promise<void> {
    try {
      await db
        .delete(userShops)
        .where(and(
          eq(userShops.userId, userId),
          eq(userShops.shopId, shopId)
        ));
    } catch (error) {
      console.error("Error removing user from shop:", error);
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
  async createRoastingBatch(data: InsertRoastingBatch): Promise<RoastingBatch> {
    try {
      console.log("Storage: Creating roasting batch with data:", {
        greenCoffeeId: data.greenCoffeeId,
        plannedAmount: data.plannedAmount,
        smallBagsProduced: data.smallBagsProduced,
        largeBagsProduced: data.largeBagsProduced,
        status: data.status
      });

      const [batch] = await db
        .insert(roastingBatches)
        .values({
          ...data,
          plannedAmount: String(data.plannedAmount),
          actualAmount: data.actualAmount ? String(data.actualAmount) : null,
          roastingLoss: data.roastingLoss ? String(data.roastingLoss) : null,
        })
        .returning();

      console.log("Storage: Created roasting batch:", batch);
      return batch;
    } catch (error) {
      console.error("Error creating roasting batch:", error);
      throw error;
    }
  }

  async getRoastingBatches(): Promise<RoastingBatch[]> {
    try {
      console.log("Storage: Fetching all roasting batches");
      const batches = await db
        .select()
        .from(roastingBatches)
        .orderBy(roastingBatches.createdAt);

      console.log("Storage: Found roasting batches:", batches.length);
      return batches;
    } catch (error) {
      console.error("Error getting roasting batches:", error);
      return [];
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

  async createGreenCoffee(data: InsertGreenCoffee): Promise<GreenCoffee> {
    try {
      console.log("Creating green coffee with data:", data);
      const [coffee] = await db
        .insert(greenCoffee)
        .values({
          ...data,
          currentStock: String(data.currentStock),
          minThreshold: String(data.minThreshold)
        })
        .returning();
      console.log("Created green coffee:", coffee);
      return coffee;
    } catch (error) {
      console.error("Error creating green coffee:", error);
      throw error;
    }
  }

  //Retail Inventory Methods
  async getAllRetailInventories(): Promise<any[]> {
    try {
      console.log("Fetching all retail inventories");
      const query = sql`
        SELECT ri.*, 
               s.name as shop_name, 
               s.location as shop_location,
               gc.name as coffee_name
        FROM retail_inventory ri
        LEFT JOIN shops s ON ri.shop_id = s.id
        LEFT JOIN green_coffee gc ON ri.green_coffee_id = gc.id
        ORDER BY ri.shop_id, ri.green_coffee_id`;

      const result = await db.execute(query);
      console.log("Found retail inventories:", result.rows.length);
      return result.rows;
    } catch (error) {
      console.error("Error getting all retail inventories:", error);
      return [];
    }
  }

  async getRetailInventoriesByShop(shopId: number): Promise<any[]> {
    try {
      console.log("Fetching retail inventories for shop:", shopId);
      const query = sql`
        SELECT ri.*, 
               s.name as shop_name, 
               s.location as shop_location,
               gc.name as coffee_name
        FROM retail_inventory ri
        LEFT JOIN shops s ON ri.shop_id = s.id
        LEFT JOIN green_coffee gc ON ri.green_coffee_id = gc.id
        WHERE ri.shop_id = ${shopId}
        ORDER BY ri.green_coffee_id`;

      const result = await db.execute(query);
      console.log("Found retail inventories for shop:", result.rows.length);
      return result.rows;
    } catch (error) {
      console.error("Error getting retail inventories for shop:", error);
      return [];
    }
  }

  // Order methods
  async createOrder(data: InsertOrder): Promise<Order> {
    try {
      console.log("Creating order with data:", data);
      const [order] = await db
        .insert(orders)
        .values(data)
        .returning();
      console.log("Created order:", order);
      return order;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  async getOrder(id: number): Promise<Order | undefined> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));
      return order;
    } catch (error) {
      console.error("Error getting order:", error);
      return undefined;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      console.log("Fetching all orders with shop data");
      const orders = await db
        .select({
          id: orders.id,
          shopId: orders.shopId,
          greenCoffeeId: orders.greenCoffeeId,
          status: orders.status,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
          createdAt: orders.createdAt,
          createdById: orders.createdById,
          updatedById: orders.updatedById,
          shop: {
            id: shops.id,
            name: shops.name,
            location: shops.location,
            isActive: shops.isActive,
            desiredSmallBags: shops.desiredSmallBags,
            desiredLargeBags: shops.desiredLargeBags,
            createdAt: shops.createdAt
          }
        })
        .from(orders)
        .leftJoin(shops, eq(orders.shopId, shops.id))
        .orderBy(orders.createdAt);

      console.log("Found orders:", orders.length);
      console.log("Sample order:", orders[0]);
      return orders;
    } catch (error) {
      console.error("Error getting all orders:", error);
      return [];
    }
  }

  async getOrdersByShop(shopId: number): Promise<Order[]> {
    try {
      const orders = await db
        .select({
          id: orders.id,
          shopId: orders.shopId,
          greenCoffeeId: orders.greenCoffeeId,
          status: orders.status,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
          createdAt: orders.createdAt,
          createdById: orders.createdById,
          updatedById: orders.updatedById,
          shop: {
            id: shops.id,
            name: shops.name,
            location: shops.location,
            isActive: shops.isActive,
            desiredSmallBags: shops.desiredSmallBags,
            desiredLargeBags: shops.desiredLargeBags,
            createdAt: shops.createdAt
          }
        })
        .from(orders)
        .leftJoin(shops, eq(orders.shopId, shops.id))
        .where(eq(orders.shopId, shopId))
        .orderBy(orders.createdAt);

      console.log("Fetched orders for shop:", shopId, "Count:", orders.length);
      return orders;
    } catch (error) {
      console.error("Error getting shop orders:", error);
      return [];
    }
  }

  async updateOrderStatus(
    id: number,
    data: { status: string; smallBags?: number; largeBags?: number; updatedById: number }
  ): Promise<Order> {
    try {
      const [order] = await db
        .update(orders)
        .set(data)
        .where(eq(orders.id, id))
        .returning();
      return order;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  // Fix inventory discrepancy methods
  async getInventoryDiscrepancies(): Promise<any[]> {
    try {
      console.log("Fetching inventory discrepancies");
      const query = sql`
        SELECT 
          dc.*,
          s.name as shop_name,
          s.location as shop_location,
          gc.name as coffee_name,
          u.username as confirmed_by
        FROM dispatched_coffee_confirmation dc
        LEFT JOIN shops s ON dc.shop_id = s.id
        LEFT JOIN green_coffee gc ON dc.green_coffee_id = gc.id
        LEFT JOIN users u ON dc.confirmed_by_id = u.id
        WHERE dc.status = 'confirmed'
        AND (
          COALESCE(dc.dispatched_small_bags, 0) != COALESCE(dc.received_small_bags, 0)
          OR COALESCE(dc.dispatched_large_bags, 0) != COALESCE(dc.received_large_bags, 0)
        )
        ORDER BY dc.created_at DESC`;

      const result = await db.execute(query);
      console.log("Found discrepancies:", result.rows.length);
      if (result.rows.length > 0) {
        console.log("Sample discrepancy:", result.rows[0]);
      }
      return result.rows;
    } catch (error) {
      console.error("Error getting inventory discrepancies:", error);
      throw error;
    }
  }

    // Add dispatched coffee confirmation methods
    async createDispatchedCoffeeConfirmation(data: any): Promise<any> {
      try {
        const [confirmation] = await db
          .insert(dispatchedCoffeeConfirmation)
          .values(data)
          .returning();
        return confirmation;
      } catch (error) {
        console.error("Error creating dispatch confirmation:", error);
        throw error;
      }
    }
  
    async confirmDispatchedCoffee(id: number, data: any): Promise<any> {
      try {
        const [confirmation] = await db
          .update(dispatchedCoffeeConfirmation)
          .set({
            ...data,
            status: 'confirmed',
            confirmedAt: new Date()
          })
          .where(eq(dispatchedCoffeeConfirmation.id, id))
          .returning();
        return confirmation;
      } catch (error) {
        console.error("Error confirming dispatched coffee:", error);
        throw error;
      }
    }
}

export const storage = new DatabaseStorage();