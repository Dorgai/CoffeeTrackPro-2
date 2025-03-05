import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["retailOwner", "roasteryOwner", "roaster", "shopManager", "barista"] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertShopSchema = createInsertSchema(shops);

// Export types for use in application code
export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
