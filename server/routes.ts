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
  try {
    // For roasteryOwner, grant access to all shops
    const user = await storage.getUser(userId);
    if (user?.role === "roasteryOwner") {
      return true;
    }

    // For other roles, check userShops table
    const userShops = await storage.getUserShops(userId);
    console.log("User shops for", userId, ":", userShops);
    return userShops.some(shop => shop.id === shopId);
  } catch (error) {
    console.error("Error checking shop access:", error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // User Management Routes
  app.get("/api/users", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role or status
  app.patch("/api/users/:id", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role, isActive, defaultShopId } = req.body;

      // Don't allow roasteryOwner to modify their own role
      if (userId === req.user!.id) {
        return res.status(403).json({ message: "Cannot modify own user account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user
      const updatedUser = await storage.updateUser(userId, {
        role,
        isActive,
        defaultShopId
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Assign user to shop
  app.post("/api/users/:id/shops", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { shopId } = req.body;

      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const shop = await storage.getShop(shopId);
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found or inactive" });
      }

      await storage.assignUserToShop(userId, shopId);
      res.json({ message: "User assigned to shop successfully" });
    } catch (error) {
      console.error("Error assigning user to shop:", error);
      res.status(500).json({ message: "Failed to assign user to shop" });
    }
  });

  // Remove user from shop
  app.delete("/api/users/:id/shops/:shopId", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const shopId = parseInt(req.params.shopId);

      await storage.removeUserFromShop(userId, shopId);
      res.json({ message: "User removed from shop successfully" });
    } catch (error) {
      console.error("Error removing user from shop:", error);
      res.status(500).json({ message: "Failed to remove user from shop" });
    }
  });

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
    // Filter out inactive shops
    const activeShops = shops.filter(shop => shop.isActive);
    res.json(activeShops);
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

  // Add DELETE endpoint for shops after the existing shops routes
  app.delete("/api/shops/:id", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const shop = await storage.getShop(shopId);

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      if (!shop.isActive) {
        return res.status(400).json({ message: "Shop is already deleted" });
      }

      const deletedShop = await storage.deleteShop(shopId);
      res.json({ message: "Shop deleted successfully", shop: deletedShop });
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Failed to delete shop" });
    }
  });

  // Add PATCH endpoint for updating shop settings after the existing shops routes
  app.patch("/api/shops/:id", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const { desiredSmallBags, desiredLargeBags } = req.body;

      const shop = await storage.getShop(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const updatedShop = await storage.updateShop(shopId, {
        desiredSmallBags: Number(desiredSmallBags),
        desiredLargeBags: Number(desiredLargeBags)
      });

      res.json(updatedShop);
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Failed to update shop" });
    }
  });

  // Green Coffee Routes - accessible by roastery owner, roaster, and shop manager
  app.get("/api/green-coffee", requireRole(["roasteryOwner", "roaster", "shopManager", "barista"]), async (req, res) => {
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


  // Add specific endpoint for coffee details
  app.get("/api/green-coffee/:id", requireRole(["roasteryOwner", "roaster", "shopManager", "barista"]), async (req, res) => {
    try {
      const coffeeId = parseInt(req.params.id);
      if (isNaN(coffeeId)) {
        return res.status(400).json({ message: "Invalid coffee ID" });
      }

      const coffee = await storage.getGreenCoffee(coffeeId);
      if (!coffee) {
        return res.status(404).json({ message: "Coffee not found" });
      }

      res.json(coffee);
    } catch (error) {
      console.error("Error fetching coffee details:", error);
      res.status(500).json({ message: "Failed to fetch coffee details" });
    }
  });

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
      let shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
      console.log("Fetching retail inventory for user:", req.user?.username, "role:", req.user?.role, "shopId:", shopId);

      // For roasteryOwner, return all inventories if no shopId provided
      if (req.user?.role === "roasteryOwner" && !shopId) {
        console.log("Fetching all retail inventories for roasteryOwner");
        const allInventory = await storage.getAllRetailInventories();
        console.log("Found inventories:", allInventory.length);
        return res.json(allInventory);
      }

      // For shop manager and barista, require shopId
      if (!shopId) {
        const userShops = await storage.getUserShops(req.user!.id);
        // If user has only one shop, use that
        if (userShops.length === 1) {
          shopId = userShops[0].id;
        } else {
          return res.status(400).json({ message: "Shop ID is required" });
        }
      }

      // Verify shop access
      if (!await checkShopAccess(req.user!.id, shopId)) {
        return res.status(403).json({ message: "User does not have access to this shop" });
      }

      const inventory = await storage.getRetailInventoriesByShop(shopId);
      console.log("Found shop inventory:", inventory.length, "items for shop:", shopId);
      return res.json(inventory);
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

        // Create dispatch confirmation when status changes to "dispatched"
        if (status === "dispatched") {
          console.log("Creating dispatch confirmation for order:", orderId);
          try {
            const confirmation = await storage.createDispatchedCoffeeConfirmation({
              orderId: order.id,
              shopId: order.shopId!,
              greenCoffeeId: order.greenCoffeeId!,
              dispatchedSmallBags: smallBags,
              dispatchedLargeBags: largeBags,
              status: "pending"
            });
            console.log("Created dispatch confirmation:", confirmation);
          } catch (error) {
            console.error("Error creating dispatch confirmation:", error);
            // Don't fail the whole request if confirmation creation fails
          }
        }

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

  // Dispatched Coffee Confirmation Routes
  app.get("/api/dispatched-coffee/confirmations", requireRole(["shopManager", "barista", "roasteryOwner"]), async (req, res) => {
    try {
      const { shopId } = req.query;
      console.log("Request for confirmations received with shopId:", shopId);

      // For roasteryOwner, allow fetching without shopId to see all confirmations
      if (req.user?.role === "roasteryOwner" && !shopId) {
        const allConfirmations = await storage.getAllDispatchedCoffeeConfirmations();
        console.log("Returning all confirmations for roasteryOwner:", allConfirmations);
        return res.json(allConfirmations);
      }

      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // For non-roasteryOwner users, verify shop access
      if (req.user?.role !== "roasteryOwner") {
        const hasAccess = await checkShopAccess(req.user!.id, Number(shopId));
        if (!hasAccess) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }
      }

      console.log("Fetching confirmations for shop:", shopId);
      const confirmations = await storage.getDispatchedCoffeeConfirmations(Number(shopId));
      console.log("Found confirmations:", confirmations);
      res.json(confirmations);
    } catch (error) {
      console.error("Error fetching dispatched coffee confirmations:", error);
      res.status(500).json({ message: "Failed to fetch confirmations" });
    }
  });

  app.post("/api/dispatched-coffee/confirm", requireRole(["shopManager", "barista"]), async (req, res) => {
    try {
      const { confirmationId, receivedSmallBags, receivedLargeBags } = req.body;

      if (!confirmationId) {
        return res.status(400).json({ message: "Confirmation ID is required" });
      }

      const confirmation = await storage.confirmDispatchedCoffee(confirmationId, {
        receivedSmallBags: Number(receivedSmallBags),
        receivedLargeBags: Number(receivedLargeBags),
        confirmedById: req.user!.id,
      });

      res.json(confirmation);
    } catch (error) {
      console.error("Error confirming dispatched coffee:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to confirm dispatch" 
      });
    }
  });

  // Inventory Discrepancies Routes
  app.get("/api/inventory-discrepancies", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      const discrepancies = await storage.getInventoryDiscrepancies();
      res.json(discrepancies);
    } catch (error) {
      console.error("Error fetching inventory discrepancies:", error);
      res.status(500).json({ message: "Failed to fetch discrepancies" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}