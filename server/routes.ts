import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertGreenCoffeeSchema, insertRoastingBatchSchema, insertOrderSchema, insertShopSchema } from "@shared/schema";
import {insertRetailInventorySchema} from "@shared/schema"; //import the missing schema

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // User's Shops Route
  app.get("/api/user/shops", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const shops = await storage.getUserShops(req.user.id);
      res.json(shops);
    } catch (error) {
      console.error("Error fetching user shops:", error);
      res.status(500).json({ message: "Failed to fetch shops" });
    }
  });

  // Shops Routes - accessible by roastery owner
  app.get("/api/shops", async (req, res) => {
    const shops = await storage.getShops();
    res.json(shops);
  });

  app.post(
    "/api/shops",
    requireRole(["roasteryOwner"]),
    async (req, res) => {
      const data = insertShopSchema.parse(req.body);
      const shop = await storage.createShop(data);
      res.status(201).json(shop);
    },
  );

  // Green Coffee Routes - accessible by roastery owner
  app.get("/api/green-coffee", async (req, res) => {
    const coffees = await storage.getGreenCoffees();
    res.json(coffees);
  });

  app.post(
    "/api/green-coffee",
    requireRole(["roasteryOwner"]),
    async (req, res) => {
      const data = insertGreenCoffeeSchema.parse(req.body);
      const coffee = await storage.createGreenCoffee(data);
      res.status(201).json(coffee);
    },
  );

  // Roasting Routes - accessible by roaster
  app.get("/api/roasting-batches", requireRole(["roaster", "roasteryOwner"]), async (req, res) => {
    const batches = await storage.getRoastingBatches();
    res.json(batches);
  });

  app.post(
    "/api/roasting-batches",
    requireRole(["roaster"]),
    async (req, res) => {
      const data = insertRoastingBatchSchema.parse(req.body);
      const batch = await storage.createRoastingBatch({
        ...data,
        roasterId: req.user!.id,
      });

      // Update green coffee stock
      const coffee = await storage.getGreenCoffee(data.greenCoffeeId);
      if (coffee) {
        await storage.updateGreenCoffeeStock(
          coffee.id,
          Number(coffee.currentStock) - Number(data.greenCoffeeAmount),
        );
      }

      res.status(201).json(batch);
    },
  );

  // Retail Inventory Routes - accessible by shop manager and barista
  app.get("/api/retail-inventory", requireRole(["shopManager", "barista"]), async (req, res) => {
    try {
      if (!req.user?.shopId) {
        return res.status(400).json({ message: "User is not assigned to a shop" });
      }
      const inventory = await storage.getRetailInventoriesByShop(req.user.shopId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching retail inventory:", error);
      res.status(500).json({ message: "Failed to fetch retail inventory" });
    }
  });

  app.post("/api/retail-inventory", requireRole(["shopManager", "barista"]), async (req, res) => {
    try {
      if (!req.user?.shopId) {
        return res.status(400).json({ message: "User is not assigned to a shop" });
      }

      console.log("Received inventory update request:", {
        body: req.body,
        user: { id: req.user.id, shopId: req.user.shopId }
      });

      const data = insertRetailInventorySchema.parse({
        ...req.body,
        shopId: req.user.shopId,
        updatedById: req.user.id
      });

      console.log("Parsed inventory data:", data);

      const inventory = await storage.updateRetailInventory(data);
      res.status(201).json(inventory);
    } catch (error) {
      console.error("Error updating retail inventory:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update inventory",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Orders Routes - accessible by shop manager and barista
  app.get("/api/orders", requireRole(["shopManager", "barista"]), async (req, res) => {
    try {
      if (!req.user?.shopId) {
        return res.status(400).json({ message: "User is not assigned to a shop" });
      }

      console.log("Fetching orders for shop:", req.user.shopId);
      const orders = await storage.getOrdersByShop(req.user.shopId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", requireRole(["shopManager", "barista"]), async (req, res) => {
    try {
      if (!req.user?.shopId) {
        return res.status(400).json({ message: "User is not assigned to a shop" });
      }

      const data = insertOrderSchema.parse({
        ...req.body,
        shopId: req.user.shopId,
        createdById: req.user.id,
        status: "pending"
      });

      const order = await storage.createOrder(data);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create order" 
      });
    }
  });

  app.patch(
    "/api/orders/:id/status",
    requireRole(["roasteryOwner"]),
    async (req, res) => {
      const order = await storage.updateOrderStatus(
        parseInt(req.params.id),
        req.body.status,
      );
      res.json(order);
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}