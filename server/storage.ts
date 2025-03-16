import { type RoastingBatch, type InsertRoastingBatch, roastingBatches, users, type User, type InsertUser, type Shop, type InsertShop, shops, userShops, type GreenCoffee, greenCoffee, type Order, type InsertOrder, orders, type RetailInventory, retailInventory, type RetailInventoryHistory, retailInventoryHistory, type BillingEvent, billingEvents, type BillingEventDetail, billingEventDetails } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Utility function for formatting dates (moved outside the class)
function formatTimestamp(date: Date): string {
  return date.toISOString(); // Keep full ISO timestamp precision
}

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
      console.log("Getting user by ID:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      console.log("Found user:", user ? "yes" : "no");
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log("Looking up user by username:", username);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      console.log("Found user:", user ? "yes" : "no");
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.log("Creating new user:", { ...user, password: "[REDACTED]" });
      const [newUser] = await db
        .insert(users)
        .values(user)
        .returning();
      console.log("Created user:", { id: newUser.id, username: newUser.username });
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Shop operations
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

  async createShop(data: InsertShop): Promise<Shop> {
    try {
      console.log("Creating shop:", data);
      const [shop] = await db
        .insert(shops)
        .values({
          ...data,
          isActive: true,
          createdAt: new Date()
        })
        .returning();
      console.log("Created shop:", shop);
      return shop;
    } catch (error) {
      console.error("Error creating shop:", error);
      throw error;
    }
  }

  // Modified to return all shops for all roles
  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      console.log("Getting shops for user:", userId);
      // Simply return all active shops for all users
      return this.getShops();
    } catch (error) {
      console.error("Error getting user shops:", error);
      return [];
    }
  }

  // Shop CRUD operations
  async updateShop(id: number, data: Partial<Shop>): Promise<Shop> {
    try {
      console.log("Updating shop:", id, "with data:", data);
      const [updatedShop] = await db
        .update(shops)
        .set(data)
        .where(eq(shops.id, id))
        .returning();
      console.log("Updated shop:", updatedShop);
      return updatedShop;
    } catch (error) {
      console.error("Error updating shop:", error);
      throw error;
    }
  }

  // Retail Inventory methods
  async getAllRetailInventories(): Promise<RetailInventory[]> {
    try {
      console.log("Starting getAllRetailInventories");
      const query = sql`
        WITH inventory_base AS (
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

      const result = await db.execute(query);
      return result.rows as RetailInventory[];
    } catch (error) {
      console.error("Error in getAllRetailInventories:", error);
      return [];
    }
  }

  async getRetailInventories(shopId?: number): Promise<RetailInventory[]> {
    try {
      console.log("Storage: Fetching retail inventories for shop:", shopId);

      const baseQuery = sql`
        WITH latest_inventory AS (
          SELECT DISTINCT ON (shop_id, green_coffee_id)
            shop_id,
            green_coffee_id,
            small_bags,
            large_bags,
            updated_at,
            updated_by_id,
            update_type,
            notes
          FROM retail_inventory
          ${shopId ? sql`WHERE shop_id = ${shopId}` : sql``}
          ORDER BY shop_id, green_coffee_id, updated_at DESC
        ),
        coffee_inventory AS (
          SELECT 
            li.*,
            s.name as shop_name,
            s.location as shop_location,
            gc.name as coffee_name,
            gc.producer,
            gc.grade,
            gc.country,
            u.username as updated_by_username
          FROM latest_inventory li
          JOIN shops s ON li.shop_id = s.id
          JOIN green_coffee gc ON li.green_coffee_id = gc.id
          LEFT JOIN users u ON li.updated_by_id = u.id
        )
        SELECT 
          ci.*,
          COALESCE(oi.total_small_bags, 0) as pending_small_bags,
          COALESCE(oi.total_large_bags, 0) as pending_large_bags
        FROM coffee_inventory ci
        LEFT JOIN (
          SELECT 
            shop_id,
            green_coffee_id,
            SUM(small_bags) as total_small_bags,
            SUM(large_bags) as total_large_bags
          FROM orders
          WHERE status = 'pending'
          GROUP BY shop_id, green_coffee_id
        ) oi ON ci.shop_id = oi.shop_id AND ci.green_coffee_id = oi.green_coffee_id
        ORDER BY ci.shop_name, ci.coffee_name`;

      const result = await db.execute(baseQuery);
      console.log("Found retail inventories:", {
        total: result.rows?.length,
        shopId,
        sampleRow: result.rows?.[0]
      });

      return result.rows as RetailInventory[];
    } catch (error) {
      console.error("Error getting retail inventories:", error);
      return [];
    }
  }


  // Green coffee methods
  async getGreenCoffees(): Promise<GreenCoffee[]> {
    try {
      console.log("Storage: Fetching all green coffee entries");
      const coffees = await db
        .select()
        .from(greenCoffee)
        .orderBy(greenCoffee.name);

      console.log("Found green coffees:", coffees.length);
      return coffees;
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

  async assignUserToShops(userId: number, shopIds: number[]): Promise<void> {
    try {
      console.log("Assigning shops to user:", userId, "shops:", shopIds);

      return await db.transaction(async (tx) => {
        // Get the user
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          throw new Error("User not found");
        }

        // Remove existing assignments
        await tx
          .delete(userShops)
          .where(eq(userShops.userId, userId));

        // If shopIds array is provided and not empty, add new assignments
        if (shopIds && shopIds.length > 0) {
          await tx
            .insert(userShops)
            .values(
              shopIds.map(shopId => ({
                userId,
                shopId
              }))
            );
        }

        console.log(`Updated assignments for user ${userId}: ${shopIds.length} shops`);
      });
    } catch (error) {
      console.error("Error assigning shops to user:", error);
      throw error;
    }
  }


  async getAllUserShopAssignments(): Promise<Array<{ userId: number; shopId: number }>> {
    try {
      console.log("Getting all user-shop assignments");

      const assignments = await db
        .select({
          userId: userShops.userId,
          shopId: userShops.shopId,
        })
        .from(userShops);

      console.log("Found assignments:", assignments);
      return assignments;
    } catch (error) {
      console.error("Error getting user-shop assignments:", error);
      return [];
    }
  }

  async updateBulkUserShopAssignments(assignments: { userId: number; shopId: number; }[]): Promise<void> {
    try {
      console.log("Starting bulk user-shop assignment update with:", assignments);

      await db.transaction(async (tx) => {
        // Get all roastery owners and retail owners
        const [owners, retailOwners] = await Promise.all([
          tx
            .select()
            .from(users)
            .where(eq(users.role, "roasteryOwner")),
          tx
            .select()
            .from(users)
            .where(eq(users.role, "retailOwner"))
        ]);

        // Get all active shops
        const activeShops = await tx
          .select()
          .from(shops)
          .where(eq(shops.isActive, true));

        console.log({
          owners: owners.length,
          retailOwners: retailOwners.length,
          activeShops: activeShops.length,
          assignments: assignments.length
        });

        // First delete all existing assignments except for roasteryOwners and retailOwners
        await tx
          .delete(userShops)
          .where(
            sql`user_id NOT IN (${sql.join(
              [...owners.map(o => o.id), ...retailOwners.map(o => o.id)],
              ','
            )})`
          );

        // Create assignments for roasteryOwners and retailOwners (they get all shops)
        const ownerAssignments = [...owners, ...retailOwners].flatMap(owner =>
          activeShops.map(shop => ({
            userId: owner.id,
            shopId: shop.id
          }))
        );

        // Filter out any assignments for owners since they already have full access
        const otherAssignments = assignments.filter(a =>
          !owners.some(owner => owner.id === a.userId) &&
          !retailOwners.some(owner => owner.id === a.userId)
        );

        // Insert all assignments at once
        if (ownerAssignments.length > 0 || otherAssignments.length > 0) {
          await tx
            .insert(userShops)
            .values([...ownerAssignments, ...otherAssignments]);
        }

        console.log("Successfully updated user-shop assignments:", {
          ownerAssignments: ownerAssignments.length,
          otherAssignments: otherAssignments.length,
          total: ownerAssignments.length + otherAssignments.length
        });
      });
    } catch (error) {
      console.error("Error updating bulk user-shop assignments:", error);
      throw error;
    }
  }

  // Add roasting batch methods
  async createRoastingBatch(batch: InsertRoastingBatch): Promise<RoastingBatch> {
    try {
      console.log("Creating roasting batch:", batch);
      const [newBatch] = await db
        .insert(roastingBatches)
        .values({
          greenCoffeeId: batch.greenCoffeeId,
          plannedAmount: batch.plannedAmount,
          status: batch.status || 'planned',
          smallBagsProduced: batch.smallBagsProduced || 0,
          largeBagsProduced: batch.largeBagsProduced || 0,
          createdAt: new Date()
        })
        .returning();

      console.log("Created roasting batch:", newBatch);
      return newBatch;
    } catch (error) {
      console.error("Error creating roasting batch:", error);
      throw error;
    }
  }

  async getRoastingBatches(): Promise<RoastingBatch[]> {
    try {
      console.log("Fetching all roasting batches");

      const query = sql`
        SELECT 
          rb.*,
          gc.name as "coffeeName",
          gc.producer
        FROM roasting_batches rb
        LEFT JOIN green_coffee gc ON rb.green_coffee_id = gc.id
        ORDER BY rb.created_at DESC
      `;

      const result = await db.execute(query);
      console.log("Found roasting batches:", result.rows?.length);

      return result.rows as RoastingBatch[];
    } catch (error) {
      console.error("Error getting roasting batches:", error);
      return [];
    }
  }

  async getRoastingBatch(id: number): Promise<RoastingBatch | undefined> {
    try {
      console.log("Getting roasting batch by ID:", id);
      const [batch] = await db
        .select()
        .from(roastingBatches)
        .where(eq(roastingBatches.id, id));
      console.log("Found batch:", batch ? "yes" : "no");
      return batch;
    } catch (error) {
      console.error("Error getting roasting batch:", error);
      return undefined;
    }
  }

  async updateRoastingBatch(id: number, data: Partial<RoastingBatch>): Promise<RoastingBatch> {
    try {
      console.log("Updating roasting batch:", id, "with data:", data);
      const [batch] = await db
        .update(roastingBatches)
        .set(data)
        .where(eq(roastingBatches.id, id))
        .returning();
      console.log("Updated roasting batch:", batch);
      return batch;
    } catch (error) {
      console.error("Error updating roasting batch:", error);
      throw error;
    }
  }

  async updateGreenCoffeeStock(id: number, data: Partial<GreenCoffee>): Promise<GreenCoffee> {
    try {
      console.log("Updating green coffee stock:", id, "with data:", data);
      const [coffee] = await db
        .update(greenCoffee)
        .set(data)
        .where(eq(greenCoffee.id, id))
        .returning();
      console.log("Updated green coffee:", coffee);
      return coffee;
    } catch (error) {
      console.error("Error updating green coffee stock:", error);
      throw error;
    }
  }

  // Add createOrder method to DatabaseStorage class
  async createOrder(data: InsertOrder): Promise<Order> {
    try {
      console.log("Creating new order:", data);
      const [order] = await db
        .insert(orders)
        .values({
          shopId: data.shopId,
          greenCoffeeId: data.greenCoffeeId,
          smallBags: data.smallBags || 0,
          largeBags: data.largeBags || 0,
          status: 'pending',
          createdById: data.createdById,
          createdAt: new Date(),
        })
        .returning();

      console.log("Created order:", order);
      return order;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  // Add getOrder and updateOrderStatus methods
  async getOrder(id: number): Promise<Order | undefined> {
    try {
      console.log("Getting order by ID:", id);
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));
      console.log("Found order:", order ? "yes" : "no");
      return order;
    } catch (error) {
      console.error("Error getting order:", error);
      return undefined;
    }
  }

  async updateOrderStatus(
    id: number,
    data: { status: string; smallBags?: number; largeBags?: number; updatedById?: number }
  ): Promise<Order> {
    try {
      console.log("Updating order status:", id, "with data:", data);

      return await db.transaction(async (tx) => {
        // Get the existing order first
        const [existingOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, id));

        if (!existingOrder) {
          throw new Error("Order not found");
        }

        // Update the order status
        const [order] = await tx
          .update(orders)
          .set({
            status: data.status,
            ...(data.smallBags !== undefined && { smallBags: data.smallBags }),
            ...(data.largeBags !== undefined && { largeBags: data.largeBags }),
            updatedAt: new Date(),
            updatedById: data.updatedById
          })
          .where(eq(orders.id, id))
          .returning();

        // If order is being delivered, update retail inventory by adding the quantities
        if (data.status === 'delivered') {
          await this.updateRetailInventory({
            shopId: order.shopId,
            greenCoffeeId: order.greenCoffeeId,
            smallBags: order.smallBags,
            largeBags: order.largeBags,
            updatedById: order.updatedById || order.createdById,
            updateType: "dispatch",
            notes: `Order #${order.id} delivered`
          });
        }

        console.log("Updated order:", order);
        return order;
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  async fetchUserShopAssignments(userId: number): Promise<Array<{ userId: number; shopId: number }>> {
    try {
      console.log(`Fetching user-shop assignments for userId: ${userId}`);
      const assignments = await db.select({ userId: userShops.userId, shopId: userShops.shopId }).from(userShops).where(eq(userShops.userId, userId));
      console.log(`Found ${assignments.length} assignments for userId: ${userId}`);
      return assignments;
    } catch (error) {
      console.error("Error fetching user-shop assignments:", error);
      return [];
    }
  }

  async updateRetailInventory(data: {
    shopId: number;
    greenCoffeeId: number;
    smallBags: number;
    largeBags: number;
    updatedById: number;
    updateType: "manual" | "dispatch";
    notes?: string;
  }): Promise<RetailInventory> {
    try {
      console.log("Starting retail inventory update:", data);

      return await db.transaction(async (tx) => {
        // First get the current inventory record using safe query
        const query = sql`
          WITH latest_inventory AS (
            SELECT * FROM retail_inventory
            WHERE shop_id = ${data.shopId} 
            AND green_coffee_id = ${data.greenCoffeeId}
            ORDER BY updated_at DESC
            LIMIT 1
          )
          SELECT * FROM latest_inventory`;

        const result = await tx.execute(query);
        const currentInventory = result.rows[0];

        // Set previous values from current inventory or default to 0
        const prevSmallBags = currentInventory?.small_bags || 0;
        const prevLargeBags = currentInventory?.large_bags || 0;

        // Validate based on update type
        if (data.updateType === "manual") {
          // For manual updates (by users), new quantities must be less than current
          if (data.smallBags > prevSmallBags || data.largeBags > prevLargeBags) {
            throw new Error("Manual updates can only decrease inventory quantities");
          }
        } else if (data.updateType === "dispatch") {
          // For dispatch updates (from delivered orders), we add to current quantities
          data.smallBags = prevSmallBags + data.smallBags;
          data.largeBags = prevLargeBags + data.largeBags;
        }

        console.log("Calculated new quantities:", {
          shopId: data.shopId,
          greenCoffeeId: data.greenCoffeeId,
          prevSmall: prevSmallBags,
          prevLarge: prevLargeBags,
          newSmall: data.smallBags,
          newLarge: data.largeBags,
          updateType: data.updateType
        });

        // Create history record first
        await tx
          .insert(retailInventoryHistory)
          .values({
            shopId: data.shopId,
            greenCoffeeId: data.greenCoffeeId,
            previousSmallBags: prevSmallBags,
            previousLargeBags: prevLargeBags,
            newSmallBags: data.smallBags,
            newLargeBags: data.largeBags,
            updatedById: data.updatedById,
            updateType: data.updateType,
            notes: data.notes || null,
            updatedAt: new Date()
          });

        // Now update or insert the current inventory
        if (currentInventory) {
          const [updatedInventory] = await tx
            .update(retailInventory)
            .set({
              smallBags: data.smallBags,
              largeBags: data.largeBags,
              updatedById: data.updatedById,
              updateType: data.updateType,
              notes: data.notes || null,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(retailInventory.shopId, data.shopId),
                eq(retailInventory.greenCoffeeId, data.greenCoffeeId)
              )
            )
            .returning();

          console.log("Successfully updated existing retail inventory:", updatedInventory);
          return updatedInventory;
        } else {
          // Insert new record if none exists
          const [inventory] = await tx
            .insert(retailInventory)
            .values({
              shopId: data.shopId,
              greenCoffeeId: data.greenCoffeeId,
              smallBags: data.smallBags,
              largeBags: data.largeBags,
              updatedById: data.updatedById,
              updateType: data.updateType,
              notes: data.notes || null,
              updatedAt: new Date()
            })
            .returning();

          console.log("Successfully created new retail inventory:", inventory);
          return inventory;
        }
      });
    } catch (error) {
      console.error("Error updating retail inventory:", error);
      throw error;
    }
  }

  async getRetailInventoryItem(shopId: number, greenCoffeeId: number): Promise<RetailInventory | undefined> {
    try {
      console.log("Getting retail inventory item for shop:", shopId, "coffee:", greenCoffeeId);

      const query = sql`
        WITH latest_inventory AS (
          SELECT DISTINCT ON (shop_id, green_coffee_id)
            shop_id,
            green_coffee_id,
            small_bags,
            large_bags,
            updated_at,
            updated_by_id,
            update_type,
            notes
          FROM retail_inventory
          WHERE shop_id = ${shopId} AND green_coffee_id = ${greenCoffeeId}
          ORDER BY shop_id, green_coffee_id, updated_at DESC
        )
        SELECT 
          li.*,
          s.name as shop_name,
          s.location as shop_location,
          gc.name as coffee_name,
          gc.producer,
          gc.grade,
          u.username as updated_by_username
        FROM latest_inventory li
        LEFT JOIN shops s ON li.shop_id = s.id
        LEFT JOIN green_coffee gc ON li.green_coffee_id = gc.id
        LEFT JOIN users u ON li.updated_by_id = u.id
        LIMIT 1`;

      const result = await db.execute(query);
      return result.rows[0] as RetailInventory | undefined;
    } catch (error) {
      console.error("Error getting retail inventory item:", error);
      return undefined;
    }
  }
  // Add createGreenCoffee method
  async createGreenCoffee(data: any): Promise<GreenCoffee> {
    try {
      console.log("Creating new green coffee entry:", data);
      const [coffee] = await db
        .insert(greenCoffee)
        .values(data)
        .returning();
      console.log("Created green coffee:", coffee);
      return coffee;
    } catch (error) {
      console.error("Error creating green coffee:", error);
      throw error;
    }
  }

  // Add new billing methods
  async getBillingHistory(): Promise<Array<BillingEvent & { details: BillingEventDetail[] }>> {
    try {
      console.log("Getting billing history with details");
      const query = sql`
        WITH events AS (
          SELECT DISTINCT ON (be.cycle_end_date)
            be.*,
            u.username as "createdByUsername"
          FROM billing_events be
          LEFT JOIN users u ON be.created_by_id = u.id
          ORDER BY be.cycle_end_date DESC
        ),
        details AS (
          SELECT 
            billing_event_id,
            json_agg(
              json_build_object(
                'id', id,
                'grade', grade,
                'smallBagsQuantity', small_bags_quantity,
                'largeBagsQuantity', large_bags_quantity
              )
            ) as details
          FROM billing_event_details
          GROUP BY billing_event_id
        )
        SELECT 
          e.*,
          COALESCE(d.details, '[]'::json) as details
        FROM events e
        LEFT JOIN details d ON e.id = d.billing_event_id
        ORDER BY e.cycle_end_date DESC`;

      const result = await db.execute(query);
      console.log("Retrieved billing history:", result.rows?.length, "events");

      return result.rows.map(row => ({
        ...row,
        details: Array.isArray(row.details) ? row.details : []
      }));
    } catch (error) {
      console.error("Error getting billing history:", error);
      return [];
    }
  }

  async getLastBillingEvent(): Promise<BillingEvent | undefined> {
    try {
      console.log("Getting last billing event");
      const query = sql`
        SELECT * FROM billing_events
        ORDER BY cycle_end_date DESC
        LIMIT 1`;

      const result = await db.execute(query);
      console.log("Last billing event found:", result.rows[0]);
      return result.rows[0] as BillingEvent | undefined;
    } catch (error) {
      console.error("Error getting last billing event:", error);
      return undefined;
    }
  }

  async getBillingQuantities(): Promise<Array<{
    grade: string;
    smallBagsQuantity: number;
    largeBagsQuantity: number;
  }>> {
    try {
      // Get the last billing event to determine the start date
      const lastEvent = await this.getLastBillingEvent();
      console.log("Last billing event for quantities:", lastEvent);

      // Use the exact timestamp of the last event's end date
      const startDate = lastEvent?.cycleEndDate || new Date(0).toISOString();

      console.log("Using exact start timestamp for billing quantities:", startDate);

      const query = sql`
        SELECT 
          gc.grade,
          COALESCE(SUM(o.small_bags), 0)::integer as "smallBagsQuantity",
          COALESCE(SUM(o.large_bags), 0)::integer as "largeBagsQuantity"
        FROM green_coffee gc
        LEFT JOIN orders o ON o.green_coffee_id = gc.id 
          AND o.status = 'delivered' 
          AND o.updated_at > ${startDate}::timestamptz
        GROUP BY gc.grade
        ORDER BY gc.grade`;

      const result = await db.execute(query);
      console.log("Retrieved billing quantities:", result.rows);

      return result.rows.map(row => ({
        grade: row.grade as string,
        smallBagsQuantity: Number(row.smallBagsQuantity),
        largeBagsQuantity: Number(row.largeBagsQuantity)
      }));
    } catch (error) {
      console.error("Error calculating billing quantities:", error);
      return [];
    }
  }

  async createBillingEvent(data: {
    cycleStartDate: Date | string;
    cycleEndDate: Date| string;
    createdById: number;
    primarySplitPercentage: number;
    secondarySplitPercentage: number;
    quantities: Array<{
      grade: string;
      smallBagsQuantity: number;
      largeBagsQuantity: number;
    }>;
  }): Promise<BillingEvent> {
    try {
      console.log("Creating billing event with data:", JSON.stringify(data, null, 2));

      if (!data.createdById) {
        throw new Error("createdById is required");
      }

      if (!Array.isArray(data.quantities)) {
        console.error("Invalid quantities:", data.quantities);
        throw new Error("Quantities must be an array");
      }

      if (data.quantities.length === 0) {
        throw new Error("No quantities provided");
      }

      return await db.transaction(async (tx) => {
        // Get active shops
        const activeShops = await tx
          .select()
          .from(shops)
          .where(eq(shops.isActive, true));

        // Get the last billing event to determine the cycle start date
        const lastEvent = await this.getLastBillingEvent();
        const now = new Date();
        const cycleStart = lastEvent ? lastEvent.cycleEndDate : '1970-01-01 00:00:00';

        console.log("Creating billing event with dates:", {
          cycleStart,
          cycleEnd: now.toISOString()
        });

        // Create billing events for each active shop
        const events = await Promise.all(
          activeShops.map(async (shop) => {
            const [event] = await tx
              .insert(billingEvents)
              .values({
                shopId: shop.id,
                amount: "0.00",
                status: "pending",
                type: "order",
                cycleStartDate: cycleStart,
                cycleEndDate: now.toISOString(),
                primarySplitPercentage: data.primarySplitPercentage,
                secondarySplitPercentage: data.secondarySplitPercentage,
                description: `Billing cycle ${cycleStart} to ${now.toISOString()}`,
                createdById: data.createdById
              })
              .returning();

            // Create billing event details for each grade with non-zero quantities
            await Promise.all(
              data.quantities
                .filter(q => q.smallBagsQuantity > 0 || q.largeBagsQuantity > 0)
                .map(q =>
                  tx
                    .insert(billingEventDetails)
                    .values({
                      billingEventId: event.id,
                      grade: q.grade,
                      smallBagsQuantity: q.smallBagsQuantity,
                      largeBagsQuantity: q.largeBagsQuantity
                    })
                )
            );

            return event;
          })
        );

        console.log("Created billing events:", events.length);
        return events[0];
      });
    } catch (error) {
      console.error("Error creating billing event:", error);
      throw error;
    }
  }

  // The rest of the class implementation remains unchanged
}

export const storage = new DatabaseStorage();