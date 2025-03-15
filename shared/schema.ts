import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["retailOwner", "roasteryOwner", "roaster", "shopManager", "barista"] as const;
export const coffeeGrades = ["Specialty", "Premium", "Rarity"] as const;
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
  grade: text("grade", { enum: coffeeGrades }).notNull().default("Premium"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const retailInventory = pgTable("retail_inventory", {
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
  shopId: integer("shop_id").notNull().references(() => shops.id),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  smallBags: integer("small_bags").notNull().default(0),
  largeBags: integer("large_bags").notNull().default(0),
  status: text("status", { enum: ["pending", "roasted", "dispatched", "delivered"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id),
  updatedById: integer("updated_by_id").references(() => users.id),
});

export const roastingBatches = pgTable("roasting_batches", {
  id: serial("id").primaryKey(),
  greenCoffeeId: integer("green_coffee_id").notNull().references(() => greenCoffee.id),
  plannedAmount: decimal("planned_amount", { precision: 10, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  roastingLoss: decimal("roasting_loss", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["planned", "in_progress", "completed"] }).notNull(),
  roastedAt: timestamp("roasted_at"),
  smallBagsProduced: integer("small_bags_produced").default(0),
  largeBagsProduced: integer("large_bags_produced").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add new billing-related tables and types
export const billingEvents = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "processed", "failed"] }).notNull(),
  type: text("type", { enum: ["order", "subscription", "adjustment"] }).notNull(),
  description: text("description"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id),
});

export const gradePricing = pgTable("grade_pricing", {
  id: serial("id").primaryKey(),
  grade: text("grade", { enum: coffeeGrades }).notNull(),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  splitPercentage: decimal("split_percentage", { precision: 5, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedById: integer("updated_by_id").references(() => users.id),
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
export const insertGreenCoffeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  producer: z.string().min(1, "Producer is required"),
  country: z.string().min(1, "Country is required"),
  currentStock: z.coerce.number().min(0, "Current stock must be 0 or greater"),
  minThreshold: z.coerce.number().min(0, "Minimum threshold must be 0 or greater"),
  grade: z.enum(coffeeGrades),
  isActive: z.boolean().default(true)
});
export const insertRetailInventorySchema = z.object({
  shopId: z.number(),
  greenCoffeeId: z.number(),
  smallBags: z.coerce.number().min(0, "Cannot be negative"),
  largeBags: z.coerce.number().min(0, "Cannot be negative"),
  updatedById: z.number().optional(),
  updateType: z.enum(["manual", "dispatch"]).default("manual"),
  notes: z.string().optional()
});
export const insertRetailInventoryHistorySchema = createInsertSchema(retailInventoryHistory);
export const insertOrderSchema = createInsertSchema(orders);
export const insertUserShopSchema = createInsertSchema(userShops);

// Add billing schemas
export const insertBillingEventSchema = createInsertSchema(billingEvents);
export const insertGradePricingSchema = createInsertSchema(gradePricing);

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type GreenCoffee = typeof greenCoffee.$inferSelect;
export type RetailInventory = typeof retailInventory.$inferSelect;
export type RetailInventoryHistory = typeof retailInventoryHistory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type RoastingBatch = typeof roastingBatches.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertGreenCoffee = z.infer<typeof insertGreenCoffeeSchema>;
export type InsertRetailInventory = z.infer<typeof insertRetailInventorySchema>;
export type InsertRetailInventoryHistory = z.infer<typeof insertRetailInventoryHistorySchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertRoastingBatch = z.infer<typeof insertRoastingBatchSchema>;
export type InsertUserShop = z.infer<typeof insertUserShopSchema>;

// Add types for the new tables
export type BillingEvent = typeof billingEvents.$inferSelect;
export type GradePricing = typeof gradePricing.$inferSelect;
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;
export type InsertGradePricing = z.infer<typeof insertGradePricingSchema>;