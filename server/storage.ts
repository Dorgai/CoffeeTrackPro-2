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
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.SessionStore;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Shops
  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  
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
  updateOrderStatus(id: number, status: Order["status"]): Promise<Order>;
}

export class MemStorage implements IStorage {
  sessionStore: session.SessionStore;
  private users: Map<number, User>;
  private shops: Map<number, Shop>;
  private greenCoffees: Map<number, GreenCoffee>;
  private roastingBatches: Map<number, RoastingBatch>;
  private retailInventories: Map<number, RetailInventory>;
  private orders: Map<number, Order>;
  private currentId: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.users = new Map();
    this.shops = new Map();
    this.greenCoffees = new Map();
    this.roastingBatches = new Map();
    this.retailInventories = new Map();
    this.orders = new Map();
    this.currentId = 1;
  }

  private nextId(): number {
    return this.currentId++;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextId();
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Shops
  async getShop(id: number): Promise<Shop | undefined> {
    return this.shops.get(id);
  }

  async getShops(): Promise<Shop[]> {
    return Array.from(this.shops.values());
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const id = this.nextId();
    const newShop = { ...shop, id };
    this.shops.set(id, newShop);
    return newShop;
  }

  // Green Coffee
  async getGreenCoffee(id: number): Promise<GreenCoffee | undefined> {
    return this.greenCoffees.get(id);
  }

  async getGreenCoffees(): Promise<GreenCoffee[]> {
    return Array.from(this.greenCoffees.values());
  }

  async createGreenCoffee(coffee: InsertGreenCoffee): Promise<GreenCoffee> {
    const id = this.nextId();
    const newCoffee = { ...coffee, id, createdAt: new Date() };
    this.greenCoffees.set(id, newCoffee);
    return newCoffee;
  }

  async updateGreenCoffeeStock(id: number, amount: number): Promise<GreenCoffee> {
    const coffee = await this.getGreenCoffee(id);
    if (!coffee) throw new Error("Coffee not found");
    
    const updated = {
      ...coffee,
      currentStock: amount,
    };
    this.greenCoffees.set(id, updated);
    return updated;
  }

  // Roasting
  async getRoastingBatch(id: number): Promise<RoastingBatch | undefined> {
    return this.roastingBatches.get(id);
  }

  async getRoastingBatches(): Promise<RoastingBatch[]> {
    return Array.from(this.roastingBatches.values());
  }

  async createRoastingBatch(batch: InsertRoastingBatch): Promise<RoastingBatch> {
    const id = this.nextId();
    const newBatch = { ...batch, id, roastedAt: new Date() };
    this.roastingBatches.set(id, newBatch);
    return newBatch;
  }

  // Retail Inventory
  async getRetailInventory(id: number): Promise<RetailInventory | undefined> {
    return this.retailInventories.get(id);
  }

  async getRetailInventoriesByShop(shopId: number): Promise<RetailInventory[]> {
    return Array.from(this.retailInventories.values()).filter(
      (inv) => inv.shopId === shopId,
    );
  }

  async updateRetailInventory(inventory: InsertRetailInventory): Promise<RetailInventory> {
    const id = this.nextId();
    const newInventory = { ...inventory, id, updatedAt: new Date() };
    this.retailInventories.set(id, newInventory);
    return newInventory;
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByShop(shopId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.shopId === shopId,
    );
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.nextId();
    const newOrder = { ...order, id, createdAt: new Date() };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: number, status: Order["status"]): Promise<Order> {
    const order = await this.getOrder(id);
    if (!order) throw new Error("Order not found");
    
    const updated = { ...order, status };
    this.orders.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
