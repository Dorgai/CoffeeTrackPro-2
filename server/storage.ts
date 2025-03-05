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
  type DispatchedCoffeeConfirmation,
  type InsertDispatchedCoffeeConfirmation,
  type InventoryDiscrepancy,
  type InsertInventoryDiscrepancy,
  type CoffeeLargeBagTarget,
  type BillingEvent,
  type BillingEventDetail,
  type InsertBillingEvent,
  type InsertBillingEventDetail,
  users,
  shops,
  greenCoffee,
  roastingBatches,
  retailInventory,
  orders,
  userShops,
  dispatchedCoffeeConfirmations,
  inventoryDiscrepancies,
  coffeeLargeBagTargets,
  billingEvents,
  billingEventDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gt, and, lt, sql } from "drizzle-orm";
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
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, update: { role?: User["role"]; isActive?: boolean; defaultShopId?: number | null; }): Promise<User>;
  assignUserToShop(userId: number, shopId: number): Promise<void>;
  removeUserFromShop(userId: number, shopId: number): Promise<void>;

  // Shops
  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  getUserShops(userId: number): Promise<Shop[]>;
  deleteShop(id: number): Promise<Shop>;

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

  // Additional methods
  getRetailInventoryHistory(shopId: number): Promise<(RetailInventory & { 
    greenCoffeeName: string; 
    updatedByUsername: string;
  })[]>;
  getAllRetailInventories(): Promise<RetailInventory[]>;
  getAllOrders(): Promise<(Order & {
    shop: Shop;
    greenCoffee: GreenCoffee;
    user: User;
    updatedBy: User | null;
  })[]>;
  getDispatchedCoffeeConfirmations(shopId: number): Promise<DispatchedCoffeeConfirmation[]>;
  createDispatchedCoffeeConfirmation(data: InsertDispatchedCoffeeConfirmation): Promise<DispatchedCoffeeConfirmation>;
  confirmDispatchedCoffee(
    confirmationId: number,
    data: {
      receivedSmallBags: number;
      receivedLargeBags: number;
      confirmedById: number;
    }
  ): Promise<DispatchedCoffeeConfirmation>;
  createInventoryDiscrepancy(data: InsertInventoryDiscrepancy): Promise<InventoryDiscrepancy>;
  getInventoryDiscrepancies(): Promise<(InventoryDiscrepancy & {
    confirmation: DispatchedCoffeeConfirmation & {
      greenCoffee: Pick<GreenCoffee, "id" | "name" | "producer">;
      shop: Pick<Shop, "id" | "name" | "location">;
    };
  })[]>;
  getAllDispatchedCoffeeConfirmations(): Promise<DispatchedCoffeeConfirmation[]>;
  getCoffeeLargeBagTargets(shopId: number): Promise<CoffeeLargeBagTarget[]>;
  updateCoffeeLargeBagTarget(
    shopId: number,
    greenCoffeeId: number,
    desiredLargeBags: number
  ): Promise<CoffeeLargeBagTarget>;
  updateShop(
    id: number,
    update: {
      desiredSmallBags?: number;
      desiredLargeBags?: number;
      isActive?: boolean;
      defaultOrderQuantity?: number;
    }
  ): Promise<Shop>;

  // Billing
  getLastBillingEvent(): Promise<BillingEvent | undefined>;
  getBillingQuantities(fromDate: Date): Promise<{ 
    grade: string;
    smallBagsQuantity: number;
    largeBagsQuantity: number;
  }[]>;
  createBillingEvent(event: InsertBillingEvent, details: InsertBillingEventDetail[]): Promise<BillingEvent>;

  //Analytics
  getAnalyticsInventoryHistory(fromDate: Date, toDate: Date): Promise<any[]>;
  getAnalyticsOrders(fromDate: Date, toDate: Date): Promise<any[]>;
  getAnalyticsRoasting(fromDate: Date, toDate: Date): Promise<any[]>;

  //Reports
  generateInventoryStatusReport(): Promise<any>;
  generateShopPerformanceReport(): Promise<any>;
  generateCoffeeConsumptionReport(): Promise<any>;
  

  // Add billing history method
  getBillingHistory(): Promise<(BillingEvent & {
    details: BillingEventDetail[];
  })[]>;
  getBillingEventDetails(eventId: number): Promise<BillingEventDetail[]>;
  hasPermission(userId: number, permission: string): Promise<boolean>;
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

  async getAllUsers(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .orderBy(users.username);
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  }

  async updateUser(
    id: number,
    update: {
      role?: User["role"];
      isActive?: boolean;
      defaultShopId?: number | null;
    }
  ): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(update)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
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
        .where(
          and(
            eq(userShops.userId, userId),
            eq(userShops.shopId, shopId)
          )
        );
    } catch (error) {
      console.error("Error removing user from shop:", error);
      throw error;
    }
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
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error("User not found");
      }

      // Roastery owners and retail owners can see all active shops
      if (user.role === "roasteryOwner" || user.role === "retailOwner") {
        return await db
          .select()
          .from(shops)
          .where(eq(shops.isActive, true))
          .orderBy(shops.name);
      }

      // Shop managers and baristas can only see their assigned shops
      if (user.role === "shopManager" || user.role === "barista") {
        return await db
          .select()
          .from(userShops)
          .innerJoin(shops, eq(userShops.shopId, shops.id))
          .where(
            and(
              eq(userShops.userId, userId),
              eq(shops.isActive, true)
            )
          )
          .orderBy(shops.name);
      }

      // Roasters can see all active shops
      if (user.role === "roaster") {
        return await db
          .select()
          .from(shops)
          .where(eq(shops.isActive, true))
          .orderBy(shops.name);
      }

      return [];
    } catch (error) {
      console.error("Error in getUserShops:", error);
      throw error;
    }
  }

  // Green Coffee
  async getGreenCoffee(id: number): Promise<GreenCoffee | undefined> {
    try {
      const [coffee] = await db
        .select({
          id: greenCoffee.id,
          name: greenCoffee.name,
          producer: greenCoffee.producer,
          country: greenCoffee.country,
          altitude: greenCoffee.altitude,
          cuppingNotes: greenCoffee.cuppingNotes,
          details: greenCoffee.details,
          currentStock: greenCoffee.currentStock,
          minThreshold: greenCoffee.minThreshold,
          createdAt: greenCoffee.createdAt,
        })
        .from(greenCoffee)
        .where(eq(greenCoffee.id, id));

      return coffee;
    } catch (error) {
      console.error("Error fetching green coffee:", error);
      throw error;
    }
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
        })
        .from(retailInventory)
        .where(eq(retailInventory.shopId, shopId))
        .orderBy(desc(retailInventory.updatedAt));
      return result;
    } catch (error) {
      console.error("Error in getRetailInventoriesByShop:", error);
      throw error;
    }
  }

  async updateRetailInventory(inventory: InsertRetailInventory): Promise<RetailInventory> {
    try {
      const existingInventory = await db
        .select()
        .from(retailInventory)
        .where(
          eq(retailInventory.shopId, inventory.shopId),
          eq(retailInventory.greenCoffeeId, inventory.greenCoffeeId)
        )
        .limit(1);

      if (existingInventory.length > 0) {
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

        return updatedInventory;
      } else {
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
  async getAllRetailInventories(): Promise<RetailInventory[]> {
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
        })
        .from(retailInventory)
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
        })
        .from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id))
        .innerJoin(greenCoffee, eq(orders.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(orders.createdById, users.id))
        .orderBy(desc(orders.createdAt));

      const ordersWithUpdatedBy = await Promise.all(
        result.map(async (order) => {
          let updatedBy = null;
          if (order.updatedById) {
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, order.updatedById));
            if (user) {
              updatedBy = user;
            }
          }
          return { ...order, updatedBy };
        })
      );

      return ordersWithUpdatedBy;
    } catch (error) {
      console.error("Error in getAllOrders:", error);
      throw error;
    }
  }

  async getDispatchedCoffeeConfirmations(shopId: number): Promise<DispatchedCoffeeConfirmation[]> {
    try {
      const confirmations = await db
        .select({
          id: dispatchedCoffeeConfirmations.id,
          orderId: dispatchedCoffeeConfirmations.orderId,
          shopId: dispatchedCoffeeConfirmations.shopId,
          greenCoffeeId: dispatchedCoffeeConfirmations.greenCoffeeId,
          dispatchedSmallBags: dispatchedCoffeeConfirmations.dispatchedSmallBags,
          dispatchedLargeBags: dispatchedCoffeeConfirmations.dispatchedLargeBags,
          receivedSmallBags: dispatchedCoffeeConfirmations.receivedSmallBags,
          receivedLargeBags: dispatchedCoffeeConfirmations.receivedLargeBags,
          status: dispatchedCoffeeConfirmations.status,
          confirmedById: dispatchedCoffeeConfirmations.confirmedById,
          confirmedAt: dispatchedCoffeeConfirmations.confirmedAt,
          createdAt: dispatchedCoffeeConfirmations.createdAt,
        })
        .from(dispatchedCoffeeConfirmations)
        .where(eq(dispatchedCoffeeConfirmations.shopId, shopId))
        .orderBy(desc(dispatchedCoffeeConfirmations.createdAt));

      return confirmations;
    } catch (error) {
      console.error("Error fetching dispatched coffee confirmations:", error);
      throw error;
    }
  }

  async createDispatchedCoffeeConfirmation(data: InsertDispatchedCoffeeConfirmation): Promise<DispatchedCoffeeConfirmation> {
    try {
      const [confirmation] = await db
        .insert(dispatchedCoffeeConfirmations)
        .values(data)
        .returning();

      return confirmation;
    } catch (error) {
      console.error("Error creating dispatched coffee confirmation:", error);
      throw error;
    }
  }

  async confirmDispatchedCoffee(
    confirmationId: number,
    data: {
      receivedSmallBags: number;
      receivedLargeBags: number;
      confirmedById: number;
    }
  ): Promise<DispatchedCoffeeConfirmation> {
    try {
      const [confirmation] = await db
        .select()
        .from(dispatchedCoffeeConfirmations)
        .where(eq(dispatchedCoffeeConfirmations.id, confirmationId));

      if (!confirmation) {
        throw new Error("Confirmation not found");
      }

      const result = await db.transaction(async (tx) => {
        const [updatedConfirmation] = await tx
          .update(dispatchedCoffeeConfirmations)
          .set({
            receivedSmallBags: data.receivedSmallBags,
            receivedLargeBags: data.receivedLargeBags,
            confirmedById: data.confirmedById,
            confirmedAt: new Date(),
            status: "confirmed",
          })
          .where(eq(dispatchedCoffeeConfirmations.id, confirmationId))
          .returning();

        if (!updatedConfirmation) {
          throw new Error("Failed to update confirmation record");
        }

        const [existingInventory] = await tx
          .select()
          .from(retailInventory)
          .where(
            and(
              eq(retailInventory.shopId, confirmation.shopId),
              eq(retailInventory.greenCoffeeId, confirmation.greenCoffeeId)
            )
          );

        if (existingInventory) {
          const [updatedInventory] = await tx
            .update(retailInventory)
            .set({
              smallBags: existingInventory.smallBags + data.receivedSmallBags,
              largeBags: existingInventory.largeBags + data.receivedLargeBags,
              updatedById: data.confirmedById,
              updatedAt: new Date(),
            })
            .where(eq(retailInventory.id, existingInventory.id))
            .returning();

          if (!updatedInventory) {
            throw new Error("Failed to update retail inventory");
          }
        } else {
          const [newInventory] = await tx
            .insert(retailInventory)
            .values({
              shopId: confirmation.shopId,
              greenCoffeeId: confirmation.greenCoffeeId,
              smallBags: data.receivedSmallBags,
              largeBags: data.receivedLargeBags,
              updatedById: data.confirmedById,
              updatedAt: new Date(),
            })
            .returning();

          if (!newInventory) {
            throw new Error("Failed to create retail inventory");
          }
        }

        if (
          confirmation.dispatchedSmallBags !== data.receivedSmallBags ||
          confirmation.dispatchedLargeBags !== data.receivedLargeBags
        ) {
          const [discrepancy] = await tx
            .insert(inventoryDiscrepancies)
            .values({
              confirmationId,
              smallBagsDifference: data.receivedSmallBags - confirmation.dispatchedSmallBags,
              largeBagsDifference: data.receivedLargeBags - confirmation.dispatchedLargeBags,
              status: "open",
            })
            .returning();

          if (!discrepancy) {
            throw new Error("Failed to create discrepancy report");
          }

          const [updatedConfirmationStatus] = await tx
            .update(dispatchedCoffeeConfirmations)
            .set({ status: "discrepancy_reported" })
            .where(eq(dispatchedCoffeeConfirmations.id, confirmationId))
            .returning();

          if (!updatedConfirmationStatus) {
            throw new Error("Failed to update confirmation status for discrepancy");
          }
        }

        return updatedConfirmation;
      });

      return result;
    } catch (error) {
      console.error("Error confirming dispatched coffee:", error);
      throw error;
    }
  }

  async createInventoryDiscrepancy(data: InsertInventoryDiscrepancy): Promise<InventoryDiscrepancy> {
    try {
      const [discrepancy] = await db
        .insert(inventoryDiscrepancies)
        .values({
          ...data,
          status: data.status || "open",
          createdAt: new Date(),
        })
        .returning();

      if (!discrepancy) {
        throw new Error("Failed to create inventory discrepancy");
      }

      return discrepancy;
    } catch (error) {
      console.error("Error creating inventory discrepancy:", error);
      throw error;
    }
  }

  async getInventoryDiscrepancies(): Promise<(InventoryDiscrepancy & {
    confirmation: DispatchedCoffeeConfirmation & {
      greenCoffee: Pick<GreenCoffee, "id" | "name" | "producer">;
      shop: Pick<Shop, "id" | "name" | "location">;
    };
  })[]> {
    try {
      console.log("Starting getInventoryDiscrepancies query...");

      const discrepancies = await db
        .select({
          id: inventoryDiscrepancies.id,
          confirmationId: inventoryDiscrepancies.confirmationId,
          smallBagsDifference: inventoryDiscrepancies.smallBagsDifference,
          largeBagsDifference: inventoryDiscrepancies.largeBagsDifference,
          notes: inventoryDiscrepancies.notes,
          status: inventoryDiscrepancies.status,
          createdAt: inventoryDiscrepancies.createdAt,
          confirmation: {
            id: dispatchedCoffeeConfirmations.id,
            orderId: dispatchedCoffeeConfirmations.orderId,
            shopId: dispatchedCoffeeConfirmations.shopId,
            greenCoffeeId: dispatchedCoffeeConfirmations.greenCoffeeId,
            dispatchedSmallBags: dispatchedCoffeeConfirmations.dispatchedSmallBags,
            dispatchedLargeBags: dispatchedCoffeeConfirmations.dispatchedLargeBags,
            receivedSmallBags: dispatchedCoffeeConfirmations.receivedSmallBags,
            receivedLargeBags: dispatchedCoffeeConfirmations.receivedLargeBags,
            status: dispatchedCoffeeConfirmations.status,
            confirmedAt: dispatchedCoffeeConfirmations.confirmedAt,
            greenCoffee: {
              id: greenCoffee.id,
              name: greenCoffee.name,
              producer: greenCoffee.producer,
            },
            shop: {
              id: shops.id,
              name: shops.name,
              location: shops.location,
            },
          },
        })
        .from(inventoryDiscrepancies)
        .innerJoin(
          dispatchedCoffeeConfirmations,
          eq(inventoryDiscrepancies.confirmationId, dispatchedCoffeeConfirmations.id)
        )
        .innerJoin(
          greenCoffee,
          eq(dispatchedCoffeeConfirmations.greenCoffeeId, greenCoffee.id)
        )
        .innerJoin(
          shops,
          eq(dispatchedCoffeeConfirmations.shopId, shops.id)
        )
        .orderBy(desc(inventoryDiscrepancies.createdAt));

      console.log("Retrieved inventory discrepancies:", JSON.stringify(discrepancies, null, 2));
      return discrepancies;
    } catch (error) {
      console.error("Error fetching inventory discrepancies:", error);
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
  async getAllDispatchedCoffeeConfirmations(): Promise<DispatchedCoffeeConfirmation[]> {
    try {
      const confirmations = await db
        .select({
          id: dispatchedCoffeeConfirmations.id,
          orderId: dispatchedCoffeeConfirmations.orderId,
          shopId: dispatchedCoffeeConfirmations.shopId,
          greenCoffeeId: dispatchedCoffeeConfirmations.greenCoffeeId,
          dispatchedSmallBags: dispatchedCoffeeConfirmations.dispatchedSmallBags,
          dispatchedLargeBags: dispatchedCoffeeConfirmations.dispatchedLargeBags,
          receivedSmallBags: dispatchedCoffeeConfirmations.receivedSmallBags,
          receivedLargeBags: dispatchedCoffeeConfirmations.receivedLargeBags,
          status: dispatchedCoffeeConfirmations.status,
          confirmedById: dispatchedCoffeeConfirmations.confirmedById,
          confirmedAt: dispatchedCoffeeConfirmations.confirmedAt,
          createdAt: dispatchedCoffeeConfirmations.createdAt,
        })
        .from(dispatchedCoffeeConfirmations)
        .orderBy(desc(dispatchedCoffeeConfirmations.createdAt));

      return confirmations;
    } catch (error) {
      console.error("Error fetching all dispatched coffee confirmations:", error);
      throw error;
    }
  }

  async getCoffeeLargeBagTargets(shopId: number): Promise<CoffeeLargeBagTarget[]> {
    try {
      return await db
        .select()
        .from(coffeeLargeBagTargets)
        .where(eq(coffeeLargeBagTargets.shopId, shopId))
        .orderBy(coffeeLargeBagTargets.createdAt);
    } catch (error) {
      console.error("Error fetching coffee large bag targets:", error);
      throw error;
    }
  }

  async updateCoffeeLargeBagTarget(
    shopId: number,
    greenCoffeeId: number,
    desiredLargeBags: number
  ): Promise<CoffeeLargeBagTarget> {
    try {
      const [existing] = await db
        .select()
        .from(coffeeLargeBagTargets)
        .where(
          and(
            eq(coffeeLargeBagTargets.shopId, shopId),
            eq(coffeeLargeBagTargets.greenCoffeeId, greenCoffeeId)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(coffeeLargeBagTargets)
          .set({
            desiredLargeBags,
            updatedAt: new Date()
          })
          .where(eq(coffeeLargeBagTargets.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(coffeeLargeBagTargets)
          .values({
            shopId,
            greenCoffeeId,
            desiredLargeBags
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error updating coffee large bag target:", error);
      throw error;
    }
  }
  async updateShop(
    id: number,
    update: {
      desiredSmallBags?: number;
      desiredLargeBags?: number;
      isActive?: boolean;
      defaultOrderQuantity?: number;
    }
  ): Promise<Shop> {
    try {
      const [updatedShop] = await db
        .update(shops)
        .set(update)
        .where(eq(shops.id, id))
        .returning();

      if (!updatedShop) {
        throw new Error("Failed to update shop");
      }

      return updatedShop;
    } catch (error) {
          console.error("Error updating shop:", error);
      throw error;
    }
  }

  // Billing methods
  async getLastBillingEvent(): Promise<BillingEvent | undefined> {
        try {
      const [lastEvent] = await db
        .select()
        .from(billingEvents)
        .orderBy(desc(billingEvents.createdAt))
        .limit(1);
            return lastEvent;
    } catch (error) {
      console.error("Error getting last billing event:", error);
      throw error;
    }
  }

  async getBillingQuantities(fromDate: Date): Promise<{
    grade: string;
    smallBagsQuantity: number;
    largeBagsQuantity: number;
  }[]> {
    try {
      const ordersData = await db
        .select({
          grade: greenCoffee.grade,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
        })        .from(orders)
        .innerJoin(greenCoffee, eq(orders.greenCoffeeId, greenCoffee.id))
        .where(
          and(
            eq(orders.status, "dispatched"),
            gt(orders.createdAt, fromDate)
          )
        );

      const initialQuantities = {
        'Specialty': { smallBagsQuantity: 0, largeBagsQuantity: 0 },
        'Premium': { smallBagsQuantity: 0, largeBagsQuantity: 0 },
        'Rarity': { smallBagsQuantity: 0, largeBagsQuantity: 0 }
      };

      const aggregatedQuantities = ordersData.reduce((acc, order) => {
        if (order.grade && acc[order.grade]) {
          acc[order.grade].smallBagsQuantity += Number(order.smallBags) || 0;
          acc[order.grade].largeBagsQuantity += Number(order.largeBags) || 0;
        }
        return acc;
      }, initialQuantities);

      return Object.entries(aggregatedQuantities).map(([grade, quantities]) => ({
        grade,
        smallBagsQuantity: quantities.smallBagsQuantity,
        largeBagsQuantity: quantities.largeBagsQuantity
      }));
    } catch (error) {
      console.error("Error fetching billing quantities:", error);
      throw error;
    }
  }

  async createBillingEvent(event: InsertBillingEvent, details: InsertBillingEventDetail[]): Promise<BillingEvent> {
    try {
      return await db.transaction(async (tx) => {
        const [newEvent] = await tx
          .insert(billingEvents)
          .values(event)
          .returning();

        await Promise.all(
          details.map(detail =>
            tx
              .insert(billingEventDetails)
              .values({ ...detail, billingEventId: newEvent.id })
          )
        );

        return newEvent;
      });
    } catch (error) {
      console.error("Error creating billing event:", error);
      throw error;
    }
  }
    // Analytics methods
  async getAnalyticsInventoryHistory(fromDate: Date, toDate: Date): Promise<any[]> {
    try {
      const result = await db
        .select({
          date: retailInventory.updatedAt,
          shopId: retailInventory.shopId,
          shopName: shops.name,
          greenCoffeeId: retailInventory.greenCoffeeId,
          coffeeName: greenCoffee.name,
          coffeeGrade: greenCoffee.grade,
          smallBags: retailInventory.smallBags,
          largeBags: retailInventory.largeBags,
          updatedByUsername: users.username
        })
        .from(retailInventory)
        .innerJoin(shops, eq(retailInventory.shopId, shops.id))
        .innerJoin(greenCoffee, eq(retailInventory.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(retailInventory.updatedById, users.id))
        .where(
          and(
            gt(retailInventory.updatedAt, fromDate),
            lt(retailInventory.updatedAt, toDate)
          )
        )
        .orderBy(desc(retailInventory.updatedAt));

      return result;
    } catch (error) {
      console.error("Error in getAnalyticsInventoryHistory:", error);
      throw error;
    }
  }

  async getAnalyticsOrders(fromDate: Date, toDate: Date): Promise<any[]> {
    try {
      const result = await db
        .select({
          date: orders.createdAt,
          shopId: orders.shopId,
          shopName: shops.name,
          greenCoffeeId: orders.greenCoffeeId,
          coffeeName: greenCoffee.name,
          coffeeGrade: greenCoffee.grade,
          status: orders.status,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
          createdByUsername: users.username,
          updatedAt: orders.updatedAt,
          updatedByUsername: {
            username: users.username
          }
        })
        .from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id))
        .innerJoin(greenCoffee, eq(orders.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(orders.createdById, users.id))
        .leftJoin(users, eq(orders.updatedById, users.id))
        .where(
          and(
            gt(orders.createdAt, fromDate),
            lt(orders.createdAt, toDate)
          )
        )
        .orderBy(desc(orders.createdAt));

      return result;
    } catch (error) {
      console.error("Error in getAnalyticsOrders:", error);
      throw error;
    }
  }
  async getAnalyticsRoasting(fromDate: Date, toDate: Date): Promise<any[]> {
    try {
      const result = await db
        .select({
          date: roastingBatches.roastedAt,
          greenCoffeeId: roastingBatches.greenCoffeeId,
          coffeeName: greenCoffee.name,
          roasterId: roastingBatches.roasterId,
          roasterName: users.username,
          greenCoffeeAmount: roastingBatches.greenCoffeeAmount,
          roastedAmount: roastingBatches.roastedAmount,
          roastingLoss: roastingBatches.roastingLoss,
          smallBagsProduced: roastingBatches.smallBagsProduced,
          largeBagsProduced: roastingBatches.largeBagsProduced,
        })
        .from(roastingBatches)
        .innerJoin(greenCoffee, eq(roastingBatches.greenCoffeeId, greenCoffee.id))
        .innerJoin(users, eq(roastingBatches.roasterId, users.id))
        .where(
          and(
            gt(roastingBatches.roastedAt, fromDate),
            lt(roastingBatches.roastedAt, toDate)
          )
        )
        .orderBy(roastingBatches.roastedAt);

      return result;
    } catch (error) {
      console.error("Error in getAnalyticsRoasting:", error);
      throw error;
    }
  }

  // Reports methods
  async generateInventoryStatusReport(): Promise<any> {
    try {
      const greenCoffeeStatus = await db
        .select({
          id: greenCoffee.id,
          name: greenCoffee.name,
          currentStock: greenCoffee.currentStock,
          minThreshold: greenCoffee.minThreshold,
        })
        .from(greenCoffee);

      const shopInventories = await db
        .select({
          shopId: retailInventory.shopId,
          shopName: shops.name,
          greenCoffeeId: retailInventory.greenCoffeeId,
          coffeeName: greenCoffee.name,
          smallBags: retailInventory.smallBags,
          largeBags: retailInventory.largeBags,
        })
        .from(retailInventory)
        .innerJoin(shops, eq(retailInventory.shopId, shops.id))
        .innerJoin(greenCoffee, eq(retailInventory.greenCoffeeId, greenCoffee.id));

      return {
        greenCoffeeStatus,
        shopInventories,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating inventory status report:", error);
      throw error;
    }
  }

  async generateShopPerformanceReport(): Promise<any> {
    try {
      const shopOrders = await db
        .select({
          shopId: orders.shopId,
          shopName: shops.name,
          ordersCount: sql`count(*)`.as('ordersCount'),
          totalSmallBags: sql`sum(${orders.smallBags})`.as('totalSmallBags'),
          totalLargeBags: sql`sum(${orders.largeBags})`.as('totalLargeBags'),
        })
        .from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id))
        .groupBy(orders.shopId, shops.name);

      const discrepancies = await db
        .select({
          shopId: shops.id,
          shopName: shops.name,
          discrepancyCount: sql`count(*)`.as('discrepancyCount'),
        })
        .from(inventoryDiscrepancies)
        .innerJoin(
          dispatchedCoffeeConfirmations,
          eq(inventoryDiscrepancies.confirmationId, dispatchedCoffeeConfirmations.id)
        )
        .innerJoin(shops, eq(dispatchedCoffeeConfirmations.shopId, shops.id))
        .groupBy(shops.id, shops.name);

      return {
        shopOrders,
        discrepancies,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating shop performance report:", error);
      throw error;
    }
  }

  async generateCoffeeConsumptionReport(): Promise<any> {
    try {
      const coffeeConsumption = await db
        .select({
          greenCoffeeId: orders.greenCoffeeId,
          coffeeName: greenCoffee.name,
          totalSmallBags: sql`sum(${orders.smallBags})`.as('totalSmallBags'),
          totalLargeBags: sql`sum(${orders.largeBags})`.as('totalLargeBags'),
          ordersCount: sql`count(*)`.as('ordersCount'),
        })
        .from(orders)
        .innerJoin(greenCoffee, eq(orders.greenCoffeeId, greenCoffee.id))
        .where(eq(orders.status, 'delivered'))
        .groupBy(orders.greenCoffeeId, greenCoffee.name);

      const roastingStats = await db
        .select({
          greenCoffeeId: roastingBatches.greenCoffeeId,
          coffeeName: greenCoffee.name,
          totalRoasted: sql`sum(${roastingBatches.roastedAmount})`.as('totalRoasted'),
          avgRoastingLoss: sql`avg(${roastingBatches.roastingLoss})`.as('avgRoastingLoss'),
          batchesCount: sql`count(*)`.as('batchesCount'),
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
          createdById: billingEvents.createdById
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
            details: details
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

      switch (permission) {
        // Billing - roastery owner only
        case 'billing.write':
        case 'billing.read':
          return role === 'roasteryOwner';

        // Green Coffee - roastery owner and roaster
        case 'greenCoffee.read':
        case 'greenCoffee.write':
          return role === 'roasteryOwner' || role === 'roaster';

        // Management - roastery owner only
        case 'shop.manage':
        case 'user.manage':
          return role === 'roasteryOwner';

        // Retail Operations - all roles
        case 'retail.read':
        case 'retail.write':
        case 'orders.read':
        case 'orders.write':
          return true;

        // Analytics & Reports - owners and managers
        case 'analytics.read':
        case 'reports.read':
          return role === 'roasteryOwner' || role === 'retailOwner' || role === 'shopManager';

        default:
          return false;
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();