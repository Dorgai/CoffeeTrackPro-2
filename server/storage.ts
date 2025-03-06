import { type RoastingBatch, type InsertRoastingBatch, roastingBatches, users, type User, type Shop, type InsertShop, shops, userShops, type GreenCoffee, type InsertGreenCoffee, greenCoffee, type Order, type InsertOrder, orders, type DispatchedCoffeeConfirmation, type InsertDispatchedCoffeeConfirmation, dispatchedCoffeeConfirmation } from "@shared/schema";
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
      if (data.role && !["roasteryOwner", "roaster", "shopManager", "barista"].includes(data.role)) {
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

  async approveUser(id: number): Promise<User> {
    try {
      console.log("Approving user:", id);

      // First check if user exists and their current status
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!existingUser) {
        throw new Error("User not found");
      }

      // Only update if user is actually pending approval
      if (!existingUser.isPendingApproval) {
        console.log("User is already approved:", existingUser);
        return existingUser;
      }

      const [user] = await db
        .update(users)
        .set({ isPendingApproval: false })
        .where(eq(users.id, id))
        .returning();

      console.log("Approved user:", user);
      return user;
    } catch (error) {
      console.error("Error approving user:", error);
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
      console.log("Storage: Creating roasting batch with data:", data);
      const [batch] = await db
        .insert(roastingBatches)
        .values({
          ...data,
          plannedAmount: data.plannedAmount.toString(),
          actualAmount: data.actualAmount?.toString() || null,
          roastingLoss: data.roastingLoss?.toString() || null,
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
          currentStock: data.currentStock.toString(),
          minThreshold: data.minThreshold.toString()
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
        SELECT 
          ri.id,
          ri.shop_id as "shopId",
          ri.green_coffee_id as "greenCoffeeId",
          ri.small_bags::integer as "smallBags",
          ri.large_bags::integer as "largeBags",
          ri.created_at as "createdAt",
          ri.updated_at as "updatedAt",
          ri.updated_by_id as "updatedById",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer,
          u.username as "updatedBy",
          COALESCE(ri.updated_at, ri.created_at) as "lastUpdated"
        FROM retail_inventory ri
        LEFT JOIN shops s ON ri.shop_id = s.id
        LEFT JOIN green_coffee gc ON ri.green_coffee_id = gc.id
        LEFT JOIN users u ON ri.updated_by_id = u.id
        ORDER BY s.name, gc.name`;

      const result = await db.execute(query);
      console.log("Found retail inventories:", result.rows.length);
      if (result.rows.length > 0) {
        console.log("Sample inventory:", {
          ...result.rows[0],
          smallBags: Number(result.rows[0].smallBags),
          largeBags: Number(result.rows[0].largeBags)
        });
      }
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
        SELECT 
          ri.id,
          ri.shop_id as "shopId",
          ri.green_coffee_id as "greenCoffeeId",
          ri.small_bags::integer as "smallBags",
          ri.large_bags::integer as "largeBags",
          ri.created_at as "createdAt",
          ri.updated_at as "updatedAt",
          ri.updated_by_id as "updatedById",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer,
          u.username as "updatedBy",
          COALESCE(ri.updated_at, ri.created_at) as "lastUpdated"
        FROM retail_inventory ri
        LEFT JOIN shops s ON ri.shop_id = s.id
        LEFT JOIN green_coffee gc ON ri.green_coffee_id = gc.id
        LEFT JOIN users u ON ri.updated_by_id = u.id
        WHERE ri.shop_id = ${shopId}
        ORDER BY gc.name`;

      const result = await db.execute(query);
      console.log("Found retail inventories for shop:", result.rows.length);
      if (result.rows.length > 0) {
        console.log("Sample inventory:", {
          ...result.rows[0],
          smallBags: Number(result.rows[0].smallBags),
          largeBags: Number(result.rows[0].largeBags)
        });
      }
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

  async getAllOrders(): Promise<any[]> {
    try {
      console.log("Fetching all orders with details");
      const query = sql`
        SELECT 
          o.id,
          o.shop_id as "shopId",
          o.green_coffee_id as "greenCoffeeId",
          o.small_bags as "smallBags",
          o.large_bags as "largeBags",
          o.status,
          o.created_at as "createdAt",
          o.created_by_id as "createdById",
          o.updated_by_id as "updatedById",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer,
          u1.username as "created_by",
          u2.username as "updated_by"
        FROM orders o
        LEFT JOIN shops s ON o.shop_id = s.id
        LEFT JOIN green_coffee gc ON o.green_coffee_id = gc.id
        LEFT JOIN users u1 ON o.created_by_id = u1.id
        LEFT JOIN users u2 ON o.updated_by_id = u2.id
        ORDER BY o.created_at DESC`;

      const result = await db.execute(query);
      console.log("Found orders:", result.rows.length);
      if (result.rows.length > 0) {
        console.log("Sample order:", result.rows[0]);
      }
      return result.rows;
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
    data: { status: "roasted" | "dispatched" | "delivered"; smallBags?: number; largeBags?: number; updatedById: number }
  ): Promise<Order> {
    try {
      console.log("Updating order status:", id, "with data:", data);

      // Get the current user's role
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.updatedById));

      // Check permissions based on role and status
      if (!user) {
        throw new Error("User not found");
      }

      // RoasteryOwners can update to any status
      if (user.role === "roasteryOwner") {
        const [order] = await db
          .update(orders)
          .set(data)
          .where(eq(orders.id, id))
          .returning();
        console.log("Updated order:", order);
        return order;
      }

      // Get current order status
      const [currentOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));

      if (!currentOrder) {
        throw new Error("Order not found");
      }

      // Roasters can update pending orders to roasted, and roasted orders to dispatched
      if (user.role === "roaster") {
        if (
          (currentOrder.status === "pending" && data.status === "roasted") ||
          (currentOrder.status === "roasted" && data.status === "dispatched")
        ) {
          const [order] = await db
            .update(orders)
            .set(data)
            .where(eq(orders.id, id))
            .returning();
          return order;
        }
        throw new Error("Invalid status transition for roaster");
      }

      // Shop managers can only mark dispatched orders as delivered
      if (user.role === "shopManager") {
        if (currentOrder.status === "dispatched" && data.status === "delivered") {
          const [order] = await db
            .update(orders)
            .set(data)
            .where(eq(orders.id, id))
            .returning();
          return order;
        }
        throw new Error("Shop managers can only mark dispatched orders as delivered");
      }

      throw new Error("Insufficient permissions to update order status");
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
          dc.id,
          dc.shop_id as "shopId",
          dc.green_coffee_id as "greenCoffeeId",
          dc.dispatched_small_bags as "dispatchedSmallBags",
          dc.dispatched_large_bags as "dispatchedLargeBags",
          dc.received_small_bags as "receivedSmallBags",
          dc.received_large_bags as "receivedLargeBags",
          dc.status,
          dc.confirmed_at as "confirmedAt",
          dc.created_at as "createdAt",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer
        FROM dispatched_coffee_confirmation dc
        LEFT JOIN shops s ON dc.shop_id = s.id
        LEFT JOIN green_coffee gc ON dc.green_coffee_id = gc.id
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
      return [];
    }
  }

  // Add dispatched coffee confirmation methods
  async getDispatchedCoffeeConfirmations(shopId: number): Promise<any[]> {
    try {
      console.log("Fetching confirmations for shop:", shopId);
      const query = sql`
        SELECT 
          dc.id,
          dc.shop_id as "shopId",
          dc.green_coffee_id as "greenCoffeeId",
          dc.dispatched_small_bags as "dispatchedSmallBags",
          dc.dispatched_large_bags as "dispatchedLargeBags",
          dc.received_small_bags as "receivedSmallBags",
          dc.received_large_bags as "receivedLargeBags",
          dc.status,
          dc.confirmed_at as "confirmedAt",
          dc.created_at as "createdAt",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer,
          u.username as "confirmedBy"
        FROM dispatched_coffee_confirmation dc
        LEFT JOIN shops s ON dc.shop_id = s.id
        LEFT JOIN green_coffee gc ON dc.green_coffee_id = gc.id
        LEFT JOIN users u ON dc.confirmed_by_id = u.id
        WHERE dc.shop_id = ${shopId}
        AND dc.status = 'pending'
        ORDER BY dc.created_at DESC`;

      const result = await db.execute(query);
      console.log("Found confirmations:", result.rows.length);
      if (result.rows.length > 0) {
        console.log("Sample confirmation:", result.rows[0]);
      }
      return result.rows;
    } catch (error) {
      console.error("Error getting dispatched coffee confirmations:", error);
      return [];
    }
  }

  async createDispatchedCoffeeConfirmation(data: InsertDispatchedCoffeeConfirmation): Promise<DispatchedCoffeeConfirmation> {
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

  async confirmDispatchedCoffee(
    id: number,
    data: {
      receivedSmallBags: number;
      receivedLargeBags: number;
      confirmedById: number;
    }
  ): Promise<DispatchedCoffeeConfirmation> {
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
  async getAllDispatchedCoffeeConfirmations(): Promise<any[]> {
    try {
      console.log("Fetching all dispatched coffee confirmations");
      const query = sql`
        SELECT 
          dc.id,
          dc.shop_id as "shopId",
          dc.green_coffee_id as "greenCoffeeId",
          dc.dispatched_small_bags as "dispatchedSmallBags",
          dc.dispatched_large_bags as "dispatchedLargeBags",
          dc.received_small_bags as "receivedSmallBags",
          dc.received_large_bags as "receivedLargeBags",
          dc.status,
          dc.confirmed_at as "confirmedAt",
          dc.created_at as "createdAt",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer,
          u.username as "confirmedBy"
        FROM dispatched_coffee_confirmation dc
        LEFT JOIN shops s ON dc.shop_id = s.id
        LEFT JOIN green_coffee gc ON dc.green_coffee_id = gc.id
        LEFT JOIN users u ON dc.confirmed_by_id = u.id
        ORDER BY dc.created_at DESC`;

      const result = await db.execute(query);
      console.log("Found confirmations:", result.rows.length);
      if (result.rows.length > 0) {
        console.log("Sample confirmation:", result.rows[0]);
      }
      return result.rows;
    } catch (error) {
      console.error("Error getting all dispatched coffee confirmations:", error);
      return [];
    }
  }
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      console.log("Fetching users with role:", role);
      const foundUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, role))
        .orderBy(users.username);
      console.log(`Found ${foundUsers.length} users with role ${role}`);
      return foundUsers;
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();