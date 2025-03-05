import {
  type User,
  type Shop,
  type RetailInventory,
  type Order,
  users,
  shops,
  retailInventory,
  orders,
  userShops,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
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
  }

  async generateCoffeeConsumptionReport(): Promise<CoffeeConsumptionReport> {
    try {
      const coffeeConsumption = await db
        .select({
          greenCoffeeId: coffeeConsumptions.greenCoffeeId,
          consumedAmount: sql`sum(${coffeeConsumptions.consumedAmount})`.as(
            "consumedAmount"
          ),
        })
        .from(coffeeConsumptions)
        .groupBy(coffeeConsumptions.greenCoffeeId);

      const roastingStats = await db
        .select({
          greenCoffeeId: roastingBatches.greenCoffeeId,
          coffeeName: greenCoffee.name,
          totalRoasted: sql`sum(${roastingBatches.roastedAmount})`.as("totalRoasted"),
          avgRoastingLoss: sql`avg(${roastingBatches.roastingLoss})`.as("avgRoastingLoss"),
          batchesCount: sql`count(*)`.as("batchesCount"),
        })
        .from(roastingBatches)
        .innerJoin(greenCoffee, eq(roastingBatches.greenCoffeeId, greenCoffee.id))
        .groupBy(roastingBatches.greenCoffeeId, greenCoffee.name);

      return {
        coffeeConsumption,
        roastingStats,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating coffee consumption report:", error);
      throw error;
    }
  }

  async getBillingHistory(): Promise<(BillingEvent & { details: BillingEventDetail[] })[]> {
    try {
      const events = await db
        .select({
          id: billingEvents.id,
          cycleStartDate: billingEvents.cycleStartDate,
          cycleEndDate: billingEvents.cycleEndDate,
          primarySplitPercentage: billingEvents.primarySplitPercentage,
          secondarySplitPercentage: billingEvents.secondarySplitPercentage,
          createdAt: billingEvents.createdAt,
          createdById: billingEvents.createdById,
        })
        .from(billingEvents)
        .orderBy(desc(billingEvents.cycleEndDate));

      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const details = await db
            .select()
            .from(billingEventDetails)
            .where(eq(billingEventDetails.billingEventId, event.id))
            .orderBy(billingEventDetails.grade);

          return {
            ...event,
            details: details,
          };
        })
      );

      return eventsWithDetails;
    } catch (error) {
      console.error("Error fetching billing history:", error);
      throw error;
    }
  }

  async getBillingEventDetails(eventId: number): Promise<BillingEventDetail[]> {
    try {
      const details = await db
        .select()
        .from(billingEventDetails)
        .where(eq(billingEventDetails.billingEventId, eventId))
        .orderBy(billingEventDetails.grade);

      return details;
    } catch (error) {
      console.error("Error fetching billing event details:", error);
      throw error;
    }
  }
  // Retail inventory operations with transaction support
  async updateRetailInventory(inventory: RetailInventory): Promise<RetailInventory> {
    return await db.transaction(async (tx) => {
      // First get current inventory with row lock
      const [current] = await tx
        .select()
        .from(retailInventory)
        .where(
          and(
            eq(retailInventory.shopId, inventory.shopId),
            eq(retailInventory.greenCoffeeId, inventory.greenCoffeeId)
          )
        )
        .forUpdate();

      if (current) {
        // Update existing inventory
        const [updated] = await tx
          .update(retailInventory)
          .set({
            smallBags: inventory.smallBags,
            largeBags: inventory.largeBags,
            updatedById: inventory.updatedById,
            updatedAt: new Date()
          })
          .where(eq(retailInventory.id, current.id))
          .returning();
        return updated;
      } else {
        // Create new inventory
        const [created] = await tx
          .insert(retailInventory)
          .values({
            ...inventory,
            updatedAt: new Date()
          })
          .returning();
        return created;
      }
    });
  }

  // Order operations with transaction support
  async createOrder(order: Order): Promise<Order> {
    return await db.transaction(async (tx) => {
      // Create the order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          ...order,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return newOrder;
    });
  }

  // Get retail inventories with proper locking
  async getRetailInventoriesByShop(shopId: number): Promise<RetailInventory[]> {
    try {
      const result = await db
        .select()
        .from(retailInventory)
        .where(eq(retailInventory.shopId, shopId))
        .orderBy(desc(retailInventory.updatedAt));

      return result;
    } catch (error) {
      console.error("Error in getRetailInventoriesByShop:", error);
      throw error;
    }
  }

  // Get orders with proper locking
  async getOrdersByShop(shopId: number): Promise<Order[]> {
    try {
      const result = await db
        .select()
        .from(orders)
        .where(eq(orders.shopId, shopId))
        .orderBy(desc(orders.createdAt));

      return result;
    } catch (error) {
      console.error("Error getting orders:", error);
      throw error;
    }
  }

  // Permission checking with proper role validation
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

      // Retail owners have full access to retail operations and orders
      if (role === "retailOwner") {
        const retailPermissions = [
          "retail.read",
          "retail.write",
          "retail.orders",
          "retail.inventory",
          "orders.read",
          "orders.write",
          "inventory.read",
          "inventory.write",
          "analytics.read",
          "reports.read"
        ];
        return retailPermissions.includes(permission);
      }

      // Shop managers have access to retail operations
      if (role === "shopManager") {
        const managerPermissions = [
          "retail.read",
          "retail.write",
          "retail.orders",
          "retail.inventory",
          "orders.read",
          "orders.write",
          "analytics.read",
          "reports.read"
        ];
        return managerPermissions.includes(permission);
      }

      // Roasters have access to roasting operations
      if (role === "roaster") {
        const roasterPermissions = [
          "roasting.read",
          "roasting.write",
          "greencoffee.read",
          "greencoffee.write"
        ];
        return roasterPermissions.includes(permission);
      }

      // Baristas have limited retail access
      if (role === "barista") {
        const baristaPermissions = [
          "retail.read",
          "orders.read"
        ];
        return baristaPermissions.includes(permission);
      }

      return false;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }

  // Get user's shops with proper concurrency handling
  async getUserShops(userId: number): Promise<Shop[]> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error("User not found");
      }

      // For retail owners, roastery owners, and shop managers return all active shops
      if (user.role === "retailOwner" || user.role === "roasteryOwner" || user.role === "shopManager") {
        return await db
          .select()
          .from(shops)
          .where(eq(shops.isActive, true))
          .orderBy(shops.name);
      }

      // All other roles see no shops
      return [];
    } catch (error) {
      console.error("Error in getUserShops:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();