import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["retailOwner", "roasteryOwner", "roaster", "shopManager", "barista"] as const;
export const coffeeGrades = ["Specialty", "Premium", "Rarity"] as const;
export type CoffeeGrade = typeof coffeeGrades[number];
export type UserRole = typeof userRoles[number];

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
  name: varchar("name").notNull(),
  producer: varchar("producer").notNull(),
  country: varchar("country").notNull(),
  currentStock: decimal("current_stock").notNull(),
  minThreshold: decimal("min_threshold").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  grade: varchar("grade", { enum: ["Specialty", "Premium", "Rarity"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const retailInventory = pgTable("retail_inventory", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  greenCoffeeId: integer("green_coffee_id").notNull(),
  smallBags: integer("small_bags").notNull(),
  largeBags: integer("large_bags").notNull(),
  updatedById: integer("updated_by_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updateType: varchar("update_type", { enum: ["manual", "dispatch"] }).notNull(),
  notes: text("notes"),
});

export const retailInventoryHistory = pgTable("retail_inventory_history", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  previousSmallBags: integer("previous_small_bags").notNull(),
  previousLargeBags: integer("previous_large_bags").notNull(),
  newSmallBags: integer("new_small_bags").notNull(),
  newLargeBags: integer("new_large_bags").notNull(),
  updatedById: integer("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  updateType: text("update_type", { enum: ["manual", "dispatch"] }).notNull(),
  notes: text("notes"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  greenCoffeeId: integer("green_coffee_id").notNull(),
  smallBags: integer("small_bags").notNull(),
  largeBags: integer("large_bags").notNull(),
  status: varchar("status", { enum: ["pending", "roasted", "dispatched", "delivered"] }).notNull(),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedById: integer("updated_by_id"),
  updatedAt: timestamp("updated_at"),
});

export const roastingBatches = pgTable("roasting_batches", {
  id: serial("id").primaryKey(),
  greenCoffeeId: integer("green_coffee_id").notNull(),
  status: varchar("status", { enum: ["planned", "in_progress", "completed"] }).notNull(),
  plannedAmount: decimal("planned_amount").notNull(),
  smallBagsProduced: integer("small_bags_produced"),
  largeBagsProduced: integer("large_bags_produced"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const retailInventories = pgTable("retail_inventories", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  smallBags: integer("small_bags").notNull().default(0),
  largeBags: integer("large_bags").notNull().default(0),
  updatedById: integer("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  updateType: text("update_type", { enum: ["manual", "dispatch"] }).notNull(),
  notes: text("notes"),
});

export const billingEvents = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  cycleStartDate: timestamp("cycle_start_date").notNull(),
  cycleEndDate: timestamp("cycle_end_date").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  primarySplitPercentage: integer("primary_split_percentage").notNull(),
  secondarySplitPercentage: integer("secondary_split_percentage").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billingEventDetails = pgTable("billing_event_details", {
  id: serial("id").primaryKey(),
  billingEventId: integer("billing_event_id").notNull().references(() => billingEvents.id),
  shopName: text("shop_name").notNull(),
  grade: text("grade", { enum: coffeeGrades }).notNull(),
  smallBagsQuantity: integer("small_bags_quantity").notNull(),
  largeBagsQuantity: integer("large_bags_quantity").notNull(),
});

export const coffeeLargeBagTargets = pgTable("coffee_large_bag_targets", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  greenCoffeeId: integer("green_coffee_id").notNull(),
  target: integer("target").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertRoastingBatchSchema = z.object({
  greenCoffeeId: z.number(),
  plannedAmount: z.coerce.number().min(0, "Planned amount must be 0 or greater"),
  status: z.enum(["planned", "in_progress", "completed"]).default("planned"),
  smallBagsProduced: z.number().optional(),
  largeBagsProduced: z.number().optional(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertShopSchema = createInsertSchema(shops);
export const insertGreenCoffeeSchema = createInsertSchema(greenCoffee);
export const insertRetailInventorySchema = createInsertSchema(retailInventory);
export const insertRetailInventoryHistorySchema = createInsertSchema(retailInventoryHistory);
export const insertOrderSchema = createInsertSchema(orders);
export const insertUserShopSchema = createInsertSchema(userShops);
export const insertCoffeeLargeBagTargetSchema = createInsertSchema(coffeeLargeBagTargets);

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type UserShop = typeof userShops.$inferSelect;
export type RetailInventory = typeof retailInventories.$inferSelect;
export type RetailInventoryHistory = typeof retailInventoryHistory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type RoastingBatch = typeof roastingBatches.$inferSelect;
export type BillingEvent = typeof billingEvents.$inferSelect;
export type BillingEventDetail = typeof billingEventDetails.$inferSelect;
export type GreenCoffee = typeof greenCoffee.$inferSelect;
export type CoffeeLargeBagTarget = typeof coffeeLargeBagTargets.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertUserShop = z.infer<typeof insertUserShopSchema>;
export type InsertRetailInventory = z.infer<typeof insertRetailInventorySchema>;
export type InsertRetailInventoryHistory = z.infer<typeof insertRetailInventoryHistorySchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertRoastingBatch = z.infer<typeof insertRoastingBatchSchema>;
export type InsertCoffeeLargeBagTarget = z.infer<typeof insertCoffeeLargeBagTargetSchema>;