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
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
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
  status: text("status", { enum: ["pending", "approved", "completed", "rejected"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id),
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

// Export types for use in application code
export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type GreenCoffee = typeof greenCoffee.$inferSelect;
export type RoastingBatch = typeof roastingBatches.$inferSelect;
export type RetailInventory = typeof retailInventory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type UserShop = typeof userShops.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertGreenCoffee = z.infer<typeof insertGreenCoffeeSchema>;
export type InsertRoastingBatch = z.infer<typeof insertRoastingBatchSchema>;
export type InsertRetailInventory = z.infer<typeof insertRetailInventorySchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertUserShop = z.infer<typeof insertUserShopSchema>;