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
  users,
  shops,
  greenCoffee,
  roastingBatches,
  retailInventory,
  orders,
  userShops,
  dispatchedCoffeeConfirmations,
  inventoryDiscrepancies,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gt, and } from "drizzle-orm";
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
  getAllUsers(): Promise<User[]>; // Added method
  updateUser(id: number, update: { role?: User["role"]; isActive?: boolean; defaultShopId?: number | null; }): Promise<User>; // Added method
  assignUserToShop(userId: number, shopId: number): Promise<void>; // Added method
  removeUserFromShop(userId: number, shopId: number): Promise<void>; // Added method

  // Shops
  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  getUserShops(userId: number): Promise<Shop[]>; // Added method
  deleteShop(id: number): Promise<Shop>; // Add to IStorage interface

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
  getRetailInventoriesByShop(shopId: number): Promise<(RetailInventory & {
    greenCoffee: GreenCoffee;
    updatedBy: User;
  })[]>;
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

  // Dispatched Coffee Confirmations
  getDispatchedCoffeeConfirmations(shopId: number): Promise<(DispatchedCoffeeConfirmation & {
    greenCoffee: GreenCoffee;
    shop: Shop;
  })[]>;

  createDispatchedCoffeeConfirmation(data: InsertDispatchedCoffeeConfirmation): Promise<DispatchedCoffeeConfirmation>;

  confirmDispatchedCoffee(
    confirmationId: number,
    data: {
      receivedSmallBags: number;
      receivedLargeBags: number;
      confirmedById: number;
    }
  ): Promise<DispatchedCoffeeConfirmation>;

  // Inventory Discrepancies
  createInventoryDiscrepancy(data: InsertInventoryDiscrepancy): Promise<InventoryDiscrepancy>;

  getInventoryDiscrepancies(): Promise<(InventoryDiscrepancy & {
    confirmation: DispatchedCoffeeConfirmation & {
      greenCoffee: GreenCoffee;
      shop: Shop;
    };
  })[]>;
  getAllDispatchedCoffeeConfirmations(): Promise<(DispatchedCoffeeConfirmation & {
    greenCoffee: GreenCoffee;
    shop: Shop;
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
      // First get the user to check their role
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      console.log("Looking up shops for user:", user?.username, "with role:", user?.role);

      // If roasteryOwner, return all active shops
      if (user?.role === "roasteryOwner") {
        return await db
          .select()
          .from(shops)
          .where(eq(shops.isActive, true));
      }

      // For other roles, get associated active shops through userShops table
      const result = await db
        .select({
          id: shops.id,
          name: shops.name,
          location: shops.location,
          isActive: shops.isActive,
          defaultOrderQuantity: shops.defaultOrderQuantity
        })
        .from(userShops)
        .innerJoin(shops, eq(userShops.shopId, shops.id))
        .where(
          and(
            eq(userShops.userId, userId),
            eq(shops.isActive, true)
          )
        );

      console.log("Found shops for user:", userId, result);
      return result;
    } catch (error) {
      console.error("Error fetching user shops:", error);
      throw error;
    }
  }

  // Green Coffee
  async getGreenCoffee(id: number): Promise<GreenCoffee | undefined> {
    try {
      console.log("Fetching green coffee details for ID:", id);
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

      console.log("Found coffee details:", coffee);
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

  async getRetailInventoriesByShop(shopId: number): Promise<(RetailInventory & {
    greenCoffee: GreenCoffee;
    updatedBy: User;
  })[]> {
    try {
      console.log("Fetching retail inventory for shop:", shopId);
      const result = await db
        .select({
          id: retailInventory.id,
          shopId: retailInventory.shopId,
          greenCoffeeId: retailInventory.greenCoffeeId,
          smallBags: retailInventory.smallBags,
          largeBags: retailInventory.largeBags,
          updatedAt: retailInventory.updatedAt,
          updatedById: retailInventory.updatedById,
          greenCoffee: {
            id: greenCoffee.id,
            name: greenCoffee.name,
            producer: greenCoffee.producer,
            country: greenCoffee.country,
            altitude: greenCoffee.altitude,
            cuppingNotes: greenCoffee.cuppingNotes,
            details: greenCoffee.details,
            currentStock: greenCoffee.currentStock,
          },
          updatedBy: {
            id: users.id,
            username: users.username,
            role: users.role,
          },
        })
        .from(greenCoffee) 
        .leftJoin(
          retailInventory,
          and(
            eq(retailInventory.greenCoffeeId, greenCoffee.id),
            eq(retailInventory.shopId, shopId)
          )
        )
        .leftJoin(users, eq(retailInventory.updatedById, users.id))
        .orderBy(desc(retailInventory.updatedAt));

      const transformedResult = result.map(item => ({
        id: item.id ?? -1, 
        shopId: shopId,
        greenCoffeeId: item.greenCoffee.id,
        smallBags: item.smallBags ?? 0,
        largeBags: item.largeBags ?? 0,
        updatedAt: item.updatedAt ?? null,
        updatedById: item.updatedById ?? null,
        greenCoffee: item.greenCoffee,
        updatedBy: item.updatedBy ?? null,
      }));

      console.log("Found retail inventory result:", transformedResult);
      return transformedResult;
    } catch (error) {
      console.error("Error in getRetailInventoriesByShop:", error);
      throw error;
    }
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

      console.log("Found retail inventories:", result);
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

      console.log("getAllOrders query result:", ordersWithUpdatedBy);
      return ordersWithUpdatedBy;
    } catch (error) {
      console.error("Error in getAllOrders:", error);
      throw error;
    }
  }

  async getDispatchedCoffeeConfirmations(shopId: number): Promise<(DispatchedCoffeeConfirmation & {
    greenCoffee: GreenCoffee;
    shop: Shop;
  })[]> {
    try {
      console.log("Fetching dispatched coffee confirmations for shop:", shopId);

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
          greenCoffee: {
            id: greenCoffee.id,
            name: greenCoffee.name,
            producer: greenCoffee.producer,
            country: greenCoffee.country,
            details: greenCoffee.details,
            currentStock: greenCoffee.currentStock,
            minThreshold: greenCoffee.minThreshold,
          },
          shop: {
            id: shops.id,
            name: shops.name,
            location: shops.location,
            isActive: shops.isActive,
            defaultOrderQuantity: shops.defaultOrderQuantity,
          },
        })
        .from(dispatchedCoffeeConfirmations)
        .innerJoin(greenCoffee, eq(dispatchedCoffeeConfirmations.greenCoffeeId, greenCoffee.id))
        .innerJoin(shops, eq(dispatchedCoffeeConfirmations.shopId, shops.id))
        .where(
          and(
            eq(dispatchedCoffeeConfirmations.shopId, shopId),
          )
        )
        .orderBy(desc(dispatchedCoffeeConfirmations.createdAt));

      console.log("Found confirmations:", confirmations);
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

      const [original] = await db
        .select()
        .from(dispatchedCoffeeConfirmations)
        .where(eq(dispatchedCoffeeConfirmations.id, confirmationId));

      if (
        original.dispatchedSmallBags !== data.receivedSmallBags ||
        original.dispatchedLargeBags !== data.receivedLargeBags
      ) {
        await db.insert(inventoryDiscrepancies).values({
          confirmationId,
          smallBagsDifference: data.receivedSmallBags - original.dispatchedSmallBags,
          largeBagsDifference: data.receivedLargeBags - original.dispatchedLargeBags,
        });

        await db
          .update(dispatchedCoffeeConfirmations)
          .set({ status: "discrepancy_reported" })
          .where(eq(dispatchedCoffeeConfirmations.id, confirmationId));
      }

      return confirmation;
    } catch (error) {
      console.error("Error confirming dispatched coffee:", error);
      throw error;
    }
  }

  async createInventoryDiscrepancy(data: InsertInventoryDiscrepancy): Promise<InventoryDiscrepancy> {
    try {
      const [discrepancy] = await db
        .insert(inventoryDiscrepancies)
        .values(data)
        .returning();

      return discrepancy;
    } catch (error) {
      console.error("Error creating inventory discrepancy:", error);
      throw error;
    }
  }

  async getInventoryDiscrepancies(): Promise<(InventoryDiscrepancy & {
    confirmation: DispatchedCoffeeConfirmation & {
      greenCoffee: GreenCoffee;
      shop: Shop;
    };
  })[]> {
    try {
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
  async getAllDispatchedCoffeeConfirmations(): Promise<(DispatchedCoffeeConfirmation & {
    greenCoffee: GreenCoffee;
    shop: Shop;
  })[]> {
    try {
      console.log("Fetching all dispatched coffee confirmations");

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
          greenCoffee: {
            id: greenCoffee.id,
            name: greenCoffee.name,
            producer: greenCoffee.producer,
            country: greenCoffee.country,
            details: greenCoffee.details,
            currentStock: greenCoffee.currentStock,
            minThreshold: greenCoffee.minThreshold,
          },
          shop: {
            id: shops.id,
            name: shops.name,
            location: shops.location,
            isActive: shops.isActive,
            defaultOrderQuantity: shops.defaultOrderQuantity,
          },
        })
        .from(dispatchedCoffeeConfirmations)
        .innerJoin(greenCoffee, eq(dispatchedCoffeeConfirmations.greenCoffeeId, greenCoffee.id))
        .innerJoin(shops, eq(dispatchedCoffeeConfirmations.shopId, shops.id))
        .orderBy(desc(dispatchedCoffeeConfirmations.createdAt));

      console.log("Found all confirmations:", confirmations);
      return confirmations;
    } catch (error) {
      console.error("Error fetching all dispatched coffee confirmations:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();