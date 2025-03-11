import { type RoastingBatch, type InsertRoastingBatch, roastingBatches, users, type User, type Shop, type InsertShop, shops, userShops, type GreenCoffee, greenCoffee, type Order, type InsertOrder, orders, type RetailInventory, retailInventory, type RetailInventoryHistory, retailInventoryHistory } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

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

  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      console.log("Getting shops for user:", userId);

      // First get the user to check their role
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        console.log("User not found:", userId);
        return [];
      }

      console.log("Getting shops for user role:", user.role);

      // Roastery owners and retail owners get access to all active shops
      if (user.role === "roasteryOwner" || user.role === "retailOwner") {
        console.log("User is roasteryOwner/retailOwner, returning all active shops");
        return this.getShops();
      }

      // Get user's shop assignments
      const assignments = await db
        .select({
          shopId: userShops.shopId
        })
        .from(userShops)
        .where(eq(userShops.userId, userId));

      console.log("Found user shop assignments:", assignments);

      if (assignments.length === 0) {
        return [];
      }

      // Get the actual shop details
      const userShopsData = await db
        .select()
        .from(shops)
        .where(
          and(
            eq(shops.isActive, true),
            inArray(
              shops.id,
              assignments.map(a => a.shopId)
            )
          )
        )
        .orderBy(shops.name);

      console.log("Found user assigned shops:", userShopsData);
      return userShopsData;
    } catch (error) {
      console.error("Error getting user shops:", error);
      return [];
    }
  }

  // Retail Inventory methods
  async getAllRetailInventories(): Promise<RetailInventory[]> {
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

      return result.rows as RetailInventory[];
    } catch (error) {
      console.error("Error in getAllRetailInventories:", error);
      return [];
    }
  }

  async getRetailInventories(shopId?: number): Promise<RetailInventory[]> {
    try {
      if (!shopId) {
        return this.getAllRetailInventories();
      }

      console.log("Storage: Fetching retail inventories for shop:", shopId);
      const query = sql`
        WITH latest_inventory AS (
          SELECT DISTINCT ON (shop_id, green_coffee_id)
            shop_id,
            green_coffee_id,
            small_bags,
            large_bags,
            updated_at,
            updated_by_id,
            update_type
          FROM retail_inventory
          WHERE shop_id = ${shopId}
          ORDER BY shop_id, green_coffee_id, updated_at DESC
        )
        SELECT 
          li.shop_id as "shopId",
          li.green_coffee_id as "coffeeId",
          COALESCE(li.small_bags, 0) as "smallBags",
          COALESCE(li.large_bags, 0) as "largeBags",
          li.updated_at as "updatedAt",
          li.updated_by_id as "updatedById",
          li.update_type as "updateType",
          s.name as "shopName",
          s.location as "shopLocation",
          gc.name as "coffeeName",
          gc.producer,
          gc.grade,
          u.username as "updatedByUsername"
        FROM latest_inventory li
        LEFT JOIN shops s ON li.shop_id = s.id
        LEFT JOIN green_coffee gc ON li.green_coffee_id = gc.id
        LEFT JOIN users u ON li.updated_by_id = u.id
        ORDER BY gc.name`;

      const result = await db.execute(query);
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
}

export const storage = new DatabaseStorage();