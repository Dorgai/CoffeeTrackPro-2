import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertGreenCoffeeSchema, insertRoastingBatchSchema, insertOrderSchema, insertShopSchema } from "@shared/schema";
import {insertRetailInventorySchema} from "@shared/schema";

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    next();
  };
}

async function checkShopAccess(userId: number, shopId: number) {
  const userShops = await storage.getUserShops(userId);
  return userShops.some(shop => shop.id === shopId);
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
  app.get("/api/shops", requireRole(["roasteryOwner"]), async (req, res) => {
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

  // Green Coffee Routes - accessible by roastery owner and roaster
  app.get("/api/green-coffee", requireRole(["roasteryOwner", "roaster"]), async (req, res) => {
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
  app.get("/api/retail-inventory", requireRole(["shopManager", "barista", "roasteryOwner"]), async (req, res) => {
    try {
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

      // For roastery owner or shop manager, if no shopId is provided, return all inventories
      if ((req.user?.role === "roasteryOwner" || req.user?.role === "shopManager") && !shopId) {
        const allInventory = await storage.getAllRetailInventories();
        return res.json(allInventory);
      }

      // Barista must provide shopId
      if (req.user?.role === "barista" && !shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      if (shopId) {
        // Allow roastery owner to access any shop's inventory
        if (req.user?.role !== "roasteryOwner" && !await checkShopAccess(req.user!.id, shopId)) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }

        const inventory = await storage.getRetailInventoriesByShop(shopId);
        return res.json(inventory);
      }
    } catch (error) {
      console.error("Error fetching retail inventory:", error);
      res.status(500).json({ message: "Failed to fetch retail inventory" });
    }
  });

  app.post("/api/retail-inventory", requireRole(["shopManager", "barista"]), async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      if (!await checkShopAccess(req.user!.id, shopId)) {
        return res.status(403).json({ message: "User does not have access to this shop" });
      }

      const data = insertRetailInventorySchema.parse({
        ...req.body,
        updatedById: req.user!.id
      });

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

  // Add new endpoint for inventory history after the existing retail inventory routes
  app.get("/api/retail-inventory/history", requireRole(["shopManager", "barista", "roasteryOwner"]), async (req, res) => {
    try {
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

      // For roastery owner and shop manager, return all history if no shopId specified
      if ((req.user?.role === "roasteryOwner" || req.user?.role === "shopManager") && !shopId) {
        const allHistory = await storage.getAllRetailInventoryHistory();
        return res.json(allHistory);
      }

      // Barista must provide shopId
      if (req.user?.role === "barista" && !shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      if (shopId) {
        if (!await checkShopAccess(req.user!.id, shopId)) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }

        const history = await storage.getRetailInventoryHistory(shopId);
        return res.json(history);
      }
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      res.status(500).json({ message: "Failed to fetch inventory history" });
    }
  });

  // Orders Routes - accessible by shop manager, barista, and roaster
  app.get("/api/orders", requireRole(["shopManager", "barista", "roaster", "roasteryOwner"]), async (req, res) => {
    try {
      console.log("Fetching orders for user:", req.user?.username, "with role:", req.user?.role);
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

      // For roaster, roastery owner, and shop manager, return all orders if no shopId specified
      if ((req.user?.role === "roaster" || req.user?.role === "roasteryOwner" || req.user?.role === "shopManager") && !shopId) {
        console.log("Fetching all orders for roaster/owner/manager");
        const allOrders = await storage.getAllOrders();
        console.log("Found orders:", allOrders.length);
        return res.json(allOrders);
      }

      // Barista must provide shopId
      if (req.user?.role === "barista" && !shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      if (shopId) {
        if (!await checkShopAccess(req.user!.id, shopId)) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }

        const orders = await storage.getOrdersByShop(shopId);
        return res.json(orders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Update order status - restrict shop manager from changing roasting-related statuses
  app.patch(
    "/api/orders/:id/status",
    requireRole(["roaster", "shopManager", "barista", "roasteryOwner"]),
    async (req, res) => {
      try {
        console.log("Order status update requested by:", req.user?.username, "with role:", req.user?.role);
        console.log("Update data:", req.body);

        const orderId = parseInt(req.params.id);
        const { status, smallBags, largeBags } = req.body;

        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        // Roastery owner has full access to all status changes
        if (req.user?.role === "roasteryOwner") {
          // Only validate quantities
          if (smallBags > order.smallBags || largeBags > order.largeBags) {
            return res.status(400).json({ 
              message: "Updated quantities cannot exceed original order quantities" 
            });
          }
        } else {
          // Shop manager can only mark orders as delivered
          if (req.user?.role === "shopManager" && status !== "delivered") {
            return res.status(403).json({
              message: "Shop managers can only mark orders as delivered"
            });
          }

          // Roaster can only change status to roasted or dispatched
          if (req.user?.role === "roaster" && !["roasted", "dispatched"].includes(status)) {
            return res.status(403).json({
              message: "Roasters can only change status to 'roasted' or 'dispatched'"
            });
          }

          // Validate quantities
          if (smallBags > order.smallBags || largeBags > order.largeBags) {
            return res.status(400).json({ 
              message: "Updated quantities cannot exceed original order quantities" 
            });
          }
        }

        const updatedOrder = await storage.updateOrderStatus(orderId, {
          status,
          smallBags,
          largeBags,
          updatedById: req.user!.id,
        });

        console.log("Order updated successfully:", updatedOrder);

        // If there are remaining bags, create a new pending order
        const remainingSmallBags = order.smallBags - smallBags;
        const remainingLargeBags = order.largeBags - largeBags;

        if (remainingSmallBags > 0 || remainingLargeBags > 0) {
          const newOrder = await storage.createOrder({
            shopId: order.shopId,
            greenCoffeeId: order.greenCoffeeId,
            smallBags: remainingSmallBags,
            largeBags: remainingLargeBags,
            createdById: order.createdById,
            status: "pending"
          });
          console.log("Created new order for remaining bags:", newOrder);
        }

        res.json(updatedOrder);
      } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ 
          message: error instanceof Error ? error.message : "Failed to update order" 
        });
      }
    }
  );

  // Create new order
  app.post("/api/orders", requireRole(["shopManager", "barista", "roasteryOwner"]), async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // Only check shop access for non-roastery owners
      if (req.user?.role !== "roasteryOwner" && !await checkShopAccess(req.user!.id, shopId)) {
        return res.status(403).json({ message: "User does not have access to this shop" });
      }

      const data = insertOrderSchema.parse({
        ...req.body,
        createdById: req.user!.id,
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


  const httpServer = createServer(app);
  return httpServer;
}