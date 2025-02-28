import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertGreenCoffeeSchema, insertRoastingBatchSchema, insertOrderSchema } from "@shared/schema";

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
  app.get("/api/retail-inventory/:shopId", requireRole(["shopManager", "barista"]), async (req, res) => {
    const inventory = await storage.getRetailInventoriesByShop(
      parseInt(req.params.shopId),
    );
    res.json(inventory);
  });

  // Orders Routes - accessible by shop manager and barista
  app.get("/api/orders/:shopId", requireRole(["shopManager", "barista"]), async (req, res) => {
    const orders = await storage.getOrdersByShop(parseInt(req.params.shopId));
    res.json(orders);
  });

  app.post("/api/orders", requireRole(["shopManager", "barista"]), async (req, res) => {
    const data = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder({
      ...data,
      createdById: req.user!.id,
      status: "pending",
    });
    res.status(201).json(order);
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