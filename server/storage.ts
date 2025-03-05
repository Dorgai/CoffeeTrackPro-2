import {
  type User,
  type Shop,
  users,
  shops,
  userShops,
} from "@shared/schema";
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
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) return false;

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
}

export const storage = new DatabaseStorage();