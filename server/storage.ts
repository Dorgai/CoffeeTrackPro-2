import { type RoastingBatch, type InsertRoastingBatch, roastingBatches, users, type User, type Shop, type InsertShop, shops, userShops } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sql } from 'drizzle-orm';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.Store;
  db = db;

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

  async assignUserToShops(userId: number): Promise<void> {
    try {
      console.log("Assigning shops to user:", userId);

      return await db.transaction(async (tx) => {
        // Get the user
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          throw new Error("User not found");
        }

        // Get all active shops
        const activeShops = await tx
          .select()
          .from(shops)
          .where(eq(shops.isActive, true));

        if (activeShops.length === 0) {
          console.log("No active shops found");
          return;
        }

        // Remove existing assignments
        await tx
          .delete(userShops)
          .where(eq(userShops.userId, userId));

        // Assign all active shops
        await tx
          .insert(userShops)
          .values(
            activeShops.map(shop => ({
              userId,
              shopId: shop.id
            }))
          );

        console.log(`Assigned ${activeShops.length} shops to user ${userId}`);
      });
    } catch (error) {
      console.error("Error assigning shops to user:", error);
      throw error;
    }
  }

  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      console.log("Getting shops for user:", userId);

      // Get all active shops - every user has access to all shops
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
        .from(shops)
        .where(eq(shops.isActive, true))
        .orderBy(shops.name);

      console.log("Found user assigned shops:", userShopsData);
      return userShopsData;
    } catch (error) {
      console.error("Error getting user shops:", error);
      return [];
    }
  }


  async getRetailInventoryHistory(shopId: number): Promise<any[]> {
    try {
      const query = sql`
        SELECT 
          ri.*,
          u.username as updated_by_username,
          gc.name as coffee_name,
          gc.producer,
          gc.grade
        FROM retail_inventory_history ri
        LEFT JOIN users u ON ri.updated_by_id = u.id
        LEFT JOIN green_coffee gc ON ri.green_coffee_id = gc.id
        WHERE ri.shop_id = ${shopId}
          AND ri.updated_at >= NOW() - INTERVAL '30 days'
        ORDER BY ri.updated_at DESC`;

      const result = await db.execute(query);
      console.log("Retrieved inventory history:", {
        shopId,
        count: result.rows?.length,
        sampleRow: result.rows?.[0]
      });
      return result.rows || [];
    } catch (error) {
      console.error("Error getting retail inventory history:", error);
      return [];
    }
  }

  async getAllRetailInventoryHistory(): Promise<any[]> {
    try {
      const query = sql`
        SELECT 
          ri.*,
          u.username as updated_by_username,
          gc.name as coffee_name,
          s.name as shop_name,
          gc.producer,
          gc.grade
        FROM retail_inventory_history ri
        LEFT JOIN users u ON ri.updated_by_id = u.id
        LEFT JOIN green_coffee gc ON ri.green_coffee_id = gc.id
        LEFT JOIN shops s ON ri.shop_id = s.id
        WHERE ri.updated_at >= NOW() - INTERVAL '30 days'
        ORDER BY ri.updated_at DESC`;

      const result = await db.execute(query);
      console.log("Retrieved all inventory history:", {
        count: result.rows?.length,
        sampleRow: result.rows?.[0]
      });
      return result.rows || [];
    } catch (error) {
      console.error("Error getting all retail inventory history:", error);
      return [];
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
      console.log("Starting getAllRetailInventories");

      const query = sql`
        WITH inventory_base AS (
          -- Get all combinations of active shops and coffee
          SELECT 
            s.id as shop_id,
            s.name as shop_name,
            s.location as shop_location,
            gc.id as coffee_id,
            gc.name as coffee_name,
            gc.producer,
            gc.grade
          FROM shops s
          CROSS JOIN green_coffee gc
          WHERE s.is_active = true
        ),
        latest_inventory AS (
          -- Get the latest inventory update for each shop and coffee
          SELECT DISTINCT ON (shop_id, green_coffee_id)
            shop_id,
            green_coffee_id,
            small_bags,
            large_bags,
            updated_at,
            updated_by_id,
            update_type
          FROM retail_inventory
          ORDER BY shop_id, green_coffee_id, updated_at DESC
        )
        SELECT 
          ib.shop_id as "shopId",
          ib.coffee_id as "coffeeId",
          COALESCE(li.small_bags, 0) as "smallBags",
          COALESCE(li.large_bags, 0) as "largeBags",
          li.updated_at as "updatedAt",
          li.updated_by_id as "updatedById",
          li.update_type as "updateType",
          ib.shop_name as "shopName",
          ib.shop_location as "shopLocation",
          ib.coffee_name as "coffeeName",
          ib.producer,
          ib.grade,
          u.username as "updatedByUsername"
        FROM inventory_base ib
        LEFT JOIN latest_inventory li ON ib.shop_id = li.shop_id AND ib.coffee_id = li.green_coffee_id
        LEFT JOIN users u ON li.updated_by_id = u.id
        ORDER BY ib.shop_name, ib.coffee_name`;

      console.log("Executing retail inventory query");
      const result = await db.execute(query);
      console.log("Query result:", {
        rowCount: result.rows?.length,
        sampleRow: result.rows?.[0]
      });

      return result.rows || [];
    } catch (error) {
      console.error("Error in getAllRetailInventories:", error);
      return [];
    }
  }

  async updateRetailInventory(data: {
    shopId: number;
    greenCoffeeId: number;
    smallBags: number;
    largeBags: number;
    updatedById: number;
    updateType?: "manual" | "dispatch";
    notes?: string;
  }): Promise<any> {
    try {
      console.log("Updating retail inventory with data:", data);

      return await db.transaction(async (tx) => {
        // First get current inventory
        const [currentInventory] = await tx
          .select()
          .from(retailInventory)
          .where(
            and(
              eq(retailInventory.shopId, data.shopId),
              eq(retailInventory.greenCoffeeId, data.greenCoffeeId)
            )
          )
          .orderBy(sql`updated_at DESC`)
          .limit(1);

        // Create history record if there's existing inventory
        if (currentInventory) {
          await tx.insert(retailInventoryHistory).values({
            shopId: data.shopId,
            greenCoffeeId: data.greenCoffeeId,
            previousSmallBags: currentInventory.smallBags,
            previousLargeBags: currentInventory.largeBags,
            newSmallBags: data.smallBags,
            newLargeBags: data.largeBags,
            updatedById: data.updatedById,
            updateType: data.updateType || "manual",
            notes: data.notes,
            updatedAt: new Date()
          });
        }

        // Then update or insert inventory
        const query = sql`
          INSERT INTO retail_inventory (
            shop_id,
            green_coffee_id,
            small_bags,
            large_bags,
            updated_by_id,
            updated_at,
            update_type,
            notes
          )
          VALUES (
            ${data.shopId},
            ${data.greenCoffeeId},
            ${data.smallBags},
            ${data.largeBags},
            ${data.updatedById},
            NOW(),
            ${data.updateType || "manual"},
            ${data.notes}
          )
          RETURNING *`;

        const result = await tx.execute(query);
        if (!result.rows?.[0]) {
          throw new Error("Failed to update retail inventory");
        }

        console.log("Updated retail inventory:", result.rows[0]);
        return result.rows[0];
      });
    } catch (error) {
      console.error("Error updating retail inventory:", error);
      throw error;
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

      return await db.transaction(async (tx) => {
        // Get the current order to compare with new status
        const [currentOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, id));

        if (!currentOrder) {
          throw new Error("Order not found");
        }

        // Update order status
        const [updatedOrder] = await tx
          .update(orders)
          .set({
            status: data.status,
            smallBags: data.smallBags || currentOrder.smallBags,
            largeBags: data.largeBags || currentOrder.largeBags,
            updatedById: data.updatedById,
          })
          .where(eq(orders.id, id))
          .returning();

        // If status is being changed to "dispatched", update retail inventory
        if (data.status === "dispatched" && currentOrder.status !== "dispatched") {
          console.log("Updating retail inventory for dispatched order");

          const query = sql`
            INSERT INTO retail_inventory (
              shop_id,
              green_coffee_id,
              small_bags,
              large_bags,
              updated_by_id,
              updated_at,
              update_type
            )
            VALUES (
              ${currentOrder.shopId},
              ${currentOrder.greenCoffeeId},
              ${Number(data.smallBags || currentOrder.smallBags)},
              ${Number(data.largeBags || currentOrder.largeBags)},
              ${data.updatedById},
              NOW(),
              'dispatch'
            )
            ON CONFLICT (shop_id, green_coffee_id)
            DO UPDATE SET
              small_bags = COALESCE(retail_inventory.small_bags, 0) + ${Number(data.smallBags || currentOrder.smallBags)},
              large_bags = COALESCE(retail_inventory.large_bags, 0) + ${Number(data.largeBags || currentOrder.largeBags)},
              updated_by_id = ${data.updatedById},
              updated_at = NOW(),
              update_type = 'dispatch';
          `;

          await tx.execute(query);
          console.log("Successfully updated retail inventory");
        }

        return updatedOrder;
      });
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