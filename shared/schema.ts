import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["retailOwner", "roasteryOwner", "roaster", "shopManager", "barista"] as const;
export const coffeeGrades = ["AA", "AB", "PB", "C", "TBD"] as const;
export type CoffeeGrade = typeof coffeeGrades[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPendingApproval: boolean("is_pending_approval").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  desiredSmallBags: integer("desired_small_bags").notNull().default(20),
  desiredLargeBags: integer("desired_large_bags").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userShops = pgTable("user_shops", {
  userId: integer("user_id").notNull().references(() => users.id),
  shopId: integer("shop_id").notNull().references(() => shops.id),
});

export const greenCoffee = pgTable("green_coffee", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  producer: text("producer").notNull(),
  country: text("country").notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull(),
  minThreshold: decimal("min_threshold", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  grade: text("grade", { enum: coffeeGrades }).notNull().default("TBD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const retailInventory = pgTable("retail_inventory", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  smallBags: integer("small_bags").notNull().default(0),
  largeBags: integer("large_bags").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  smallBags: integer("small_bags").notNull().default(0),
  largeBags: integer("large_bags").notNull().default(0),
  status: text("status", { enum: ["pending", "roasted", "dispatched", "delivered"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roastingBatches = pgTable("roasting_batches", {
  id: serial("id").primaryKey(),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  plannedAmount: decimal("planned_amount", { precision: 10, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  roastingLoss: decimal("roasting_loss", { precision: 10, scale: 2 }),
  smallBagsProduced: integer("small_bags_produced").notNull().default(0),
  largeBagsProduced: integer("large_bags_produced").notNull().default(0),
  status: text("status", { enum: ["planned", "in_progress", "completed"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoastingBatchSchema = z.object({
  greenCoffeeId: z.number(),
  plannedAmount: z.coerce.number().min(0, "Planned amount must be 0 or greater"),
  actualAmount: z.coerce.number().optional(),
  roastingLoss: z.coerce.number().optional(),
  smallBagsProduced: z.number(),
  largeBagsProduced: z.number(),
  status: z.enum(["planned", "in_progress", "completed"]).default("planned"),
});

export const insertUserSchema = createInsertSchema(users);
export const insertShopSchema = createInsertSchema(shops);
export const insertGreenCoffeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  producer: z.string().min(1, "Producer is required"),
  country: z.string().min(1, "Country is required"),
  currentStock: z.coerce.number().min(0, "Current stock must be 0 or greater"),
  minThreshold: z.coerce.number().min(0, "Minimum threshold must be 0 or greater"),
  grade: z.enum(coffeeGrades),
  isActive: z.boolean().default(true)
});
export const insertRetailInventorySchema = createInsertSchema(retailInventory);
export const insertOrderSchema = createInsertSchema(orders);
export const insertUserShopSchema = createInsertSchema(userShops);

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type GreenCoffee = typeof greenCoffee.$inferSelect;
export type RetailInventory = typeof retailInventory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type RoastingBatch = typeof roastingBatches.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertGreenCoffee = z.infer<typeof insertGreenCoffeeSchema>;
export type InsertRetailInventory = z.infer<typeof insertRetailInventorySchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertRoastingBatch = z.infer<typeof insertRoastingBatchSchema>;
export type InsertUserShop = z.infer<typeof insertUserShopSchema>;