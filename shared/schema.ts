import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["roasteryOwner", "roaster", "shopManager", "barista"] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  defaultShopId: integer("default_shop_id").references(() => shops.id),
  isActive: boolean("is_active").notNull().default(false),
  isPendingApproval: boolean("is_pending_approval").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  defaultOrderQuantity: integer("default_order_quantity").notNull().default(10),
  desiredSmallBags: integer("desired_small_bags").notNull().default(20),
  desiredLargeBags: integer("desired_large_bags").notNull().default(10),
});

// New table for many-to-many relationship between users and shops
export const userShops = pgTable("user_shops", {
  userId: integer("user_id").references(() => users.id).notNull(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
});

export const greenCoffee = pgTable("green_coffee", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  producer: text("producer").notNull(),
  country: text("country").notNull(),
  altitude: text("altitude"),
  cuppingNotes: text("cupping_notes"),
  details: json("details").$type<Record<string, string>>(),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull(),
  minThreshold: decimal("min_threshold", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roastingBatches = pgTable("roasting_batches", {
  id: serial("id").primaryKey(),
  greenCoffeeId: integer("green_coffee_id").references(() => greenCoffee.id),
  greenCoffeeAmount: decimal("green_coffee_amount", { precision: 10, scale: 2 }).notNull(),
  roastedAmount: decimal("roasted_amount", { precision: 10, scale: 2 }).notNull(),
  roastingLoss: decimal("roasting_loss", { precision: 10, scale: 2 }).notNull(),
  smallBagsProduced: integer("small_bags_produced").notNull(),
  largeBagsProduced: integer("large_bags_produced").notNull(),
  roastedAt: timestamp("roasted_at").defaultNow(),
  roasterId: integer("roaster_id").references(() => users.id),
});

export const retailInventory = pgTable("retail_inventory", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").references(() => greenCoffee.id),
  smallBags: integer("small_bags").notNull(),
  largeBags: integer("large_bags").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedById: integer("updated_by_id").references(() => users.id),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").references(() => greenCoffee.id),
  smallBags: integer("small_bags").notNull(),
  largeBags: integer("large_bags").notNull(),
  status: text("status", {
    enum: ["pending", "roasted", "dispatched", "delivered"]
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedById: integer("updated_by_id").references(() => users.id),
});

// New table for tracking dispatched coffee confirmations
export const dispatchedCoffeeConfirmations = pgTable("dispatched_coffee_confirmations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  greenCoffeeId: integer("green_coffee_id").references(() => greenCoffee.id).notNull(),
  dispatchedSmallBags: integer("dispatched_small_bags").notNull(),
  dispatchedLargeBags: integer("dispatched_large_bags").notNull(),
  receivedSmallBags: integer("received_small_bags"),
  receivedLargeBags: integer("received_large_bags"),
  status: text("status", {
    enum: ["pending", "confirmed", "discrepancy_reported"]
  }).notNull().default("pending"),
  confirmedById: integer("confirmed_by_id").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table for inventory discrepancy alerts
export const inventoryDiscrepancies = pgTable("inventory_discrepancies", {
  id: serial("id").primaryKey(),
  confirmationId: integer("confirmation_id").references(() => dispatchedCoffeeConfirmations.id).notNull(),
  smallBagsDifference: integer("small_bags_difference").notNull(),
  largeBagsDifference: integer("large_bags_difference").notNull(),
  notes: text("notes"),
  status: text("status", {
    enum: ["open", "investigating", "resolved"]
  }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id").references(() => users.id),
});

// Create insert schemas for each table
export const insertUserSchema = createInsertSchema(users);
export const insertShopSchema = createInsertSchema(shops);
export const insertGreenCoffeeSchema = createInsertSchema(greenCoffee);
export const insertRoastingBatchSchema = createInsertSchema(roastingBatches).extend({
  greenCoffeeId: z.coerce.number(),
  greenCoffeeAmount: z.coerce.number().min(0, "Amount must be positive"),
  roastedAmount: z.coerce.number().min(0, "Amount must be positive"),
  roastingLoss: z.coerce.number().min(0, "Loss must be positive"),
  smallBagsProduced: z.coerce.number().int().min(0, "Number of bags must be positive"),
  largeBagsProduced: z.coerce.number().int().min(0, "Number of bags must be positive"),
});
export const insertRetailInventorySchema = createInsertSchema(retailInventory).extend({
  shopId: z.number(),
  greenCoffeeId: z.number(),
  smallBags: z.number().int().min(0),
  largeBags: z.number().int().min(0),
  updatedById: z.number()
});
export const insertOrderSchema = createInsertSchema(orders);
export const insertUserShopSchema = createInsertSchema(userShops);

// Create insert schemas for new tables
export const insertDispatchedCoffeeConfirmationSchema = createInsertSchema(dispatchedCoffeeConfirmations).extend({
  orderId: z.number(),
  shopId: z.number(),
  greenCoffeeId: z.number(),
  dispatchedSmallBags: z.number().int().min(0),
  dispatchedLargeBags: z.number().int().min(0),
  receivedSmallBags: z.number().int().min(0).optional(),
  receivedLargeBags: z.number().int().min(0).optional(),
});

export const insertInventoryDiscrepancySchema = createInsertSchema(inventoryDiscrepancies).extend({
  confirmationId: z.number(),
  smallBagsDifference: z.number().int(),
  largeBagsDifference: z.number().int(),
});

// Export types for use in application code
export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type GreenCoffee = typeof greenCoffee.$inferSelect;
export type RoastingBatch = typeof roastingBatches.$inferSelect;
export type RetailInventory = typeof retailInventory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type UserShop = typeof userShops.$inferSelect;

// Export types for new tables
export type DispatchedCoffeeConfirmation = typeof dispatchedCoffeeConfirmations.$inferSelect;
export type InventoryDiscrepancy = typeof inventoryDiscrepancies.$inferSelect;
export type InsertDispatchedCoffeeConfirmation = z.infer<typeof insertDispatchedCoffeeConfirmationSchema>;
export type InsertInventoryDiscrepancy = z.infer<typeof insertInventoryDiscrepancySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertGreenCoffee = z.infer<typeof insertGreenCoffeeSchema>;
export type InsertRoastingBatch = z.infer<typeof insertRoastingBatchSchema>;
export type InsertRetailInventory = z.infer<typeof insertRetailInventorySchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertUserShop = z.infer<typeof insertUserShopSchema>;