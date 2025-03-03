import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertGreenCoffeeSchema, insertRoastingBatchSchema, insertOrderSchema, insertShopSchema } from "@shared/schema";
import {insertRetailInventorySchema} from "@shared/schema";
import { sql } from "sql-template-strings";

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log("Authorization failed: No user in request");
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }

    if (!roles.includes(req.user.role)) {
      console.log("Authorization failed: User role", req.user.role, "not in allowed roles:", roles);
      return res.status(403).json({ message: "Unauthorized - Insufficient permissions" });
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

  // Shops Routes - accessible by roastery owner and shop manager
  app.get("/api/shops/:id", requireRole(["roasteryOwner", "shopManager", "barista"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);

      // For non-roasteryOwner users, verify shop access
      if (req.user?.role !== "roasteryOwner") {
        const hasAccess = await checkShopAccess(req.user!.id, shopId);
        if (!hasAccess) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }
      }

      const shop = await storage.getShop(shopId);
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.json(shop);
    } catch (error) {
      console.error("Error fetching shop details:", error);
      res.status(500).json({ message: "Failed to fetch shop details" });
    }
  });

  app.get("/api/shops", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      let shops;

      // For roasteryOwner, return all active shops
      if (req.user?.role === "roasteryOwner") {
        shops = await storage.getShops();
        shops = shops.filter(shop => shop.isActive);
      } 
      // For shopManager, return only their assigned shops
      else {
        shops = await storage.getUserShops(req.user!.id);
        shops = shops.filter(shop => shop.isActive);
      }

      res.json(shops);
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Failed to fetch shops" });
    }
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

  // Update shop settings route
  app.patch("/api/shops/:id", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const shop = await storage.getShop(shopId);

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      // For non-roasteryOwner users, verify shop access
      if (req.user?.role !== "roasteryOwner") {
        const hasAccess = await checkShopAccess(req.user!.id, shopId);
        if (!hasAccess) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }
      }

      const { desiredSmallBags, desiredLargeBags } = req.body;

      // Validate inputs
      if (typeof desiredSmallBags !== 'number' || desiredSmallBags < 0) {
        return res.status(400).json({ message: "Invalid small bags value" });
      }
      if (typeof desiredLargeBags !== 'number' || desiredLargeBags < 0) {
        return res.status(400).json({ message: "Invalid large bags value" });
      }

      console.log("Updating shop:", shopId, "with new targets - small:", desiredSmallBags, "large:", desiredLargeBags);

      // Update shop using storage method
      const updatedShop = await storage.updateShop(shopId, {
        desiredSmallBags,
        desiredLargeBags,
      });

      console.log("Shop updated successfully:", updatedShop);
      res.json(updatedShop);
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Failed to update shop" });
    }
  });

  // Green Coffee Routes - accessible by roastery owner and roaster
  app.get("/api/green-coffee", requireRole(["roasteryOwner", "roaster", "shopManager", "barista"]), async (req, res) => {
    try {
      console.log("Fetching green coffee list, requested by:", req.user?.username, "role:", req.user?.role);
      const coffees = await storage.getGreenCoffees();
      res.json(coffees);
    } catch (error) {
      console.error("Error fetching green coffee list:", error);
      res.status(500).json({ message: "Failed to fetch coffee list" });
    }
  });

  // Update endpoint for green coffee with proper roaster permissions
  app.patch(
    "/api/green-coffee/:id",
    requireRole(["roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        const coffeeId = parseInt(req.params.id);
        const coffee = await storage.getGreenCoffee(coffeeId);

        if (!coffee) {
          return res.status(404).json({ message: "Coffee not found" });
        }

        // Log the update attempt
        console.log("Updating green coffee:", {
          coffeeId,
          updatedBy: req.user?.username,
          role: req.user?.role,
          updates: req.body
        });

        // Use updateGreenCoffeeStock for both roaster and roasteryOwner
        const updatedCoffee = await storage.updateGreenCoffeeStock(coffeeId, req.body);

        console.log("Successfully updated coffee:", updatedCoffee);
        res.json(updatedCoffee);
      } catch (error) {
        console.error("Error updating green coffee:", error);
        res.status(500).json({ 
          message: error instanceof Error ? error.message : "Failed to update green coffee",
          details: error instanceof Error ? error.stack : undefined
        });
      }
    }
  );

  // Get specific green coffee details
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

      console.log("Fetching coffee details:", {
        coffeeId,
        requestedBy: req.user?.username,
        role: req.user?.role
      });

      res.json(coffee);
    } catch (error) {
      console.error("Error fetching coffee details:", error);
      res.status(500).json({ message: "Failed to fetch coffee details" });
    }
  });


  // Roasting Routes - accessible by roaster
  app.get("/api/roasting-batches", requireRole(["roaster", "roasteryOwner"]), async (req, res) => {
    try {
      const batches = await storage.getRoastingBatches();
      console.log("Fetched roasting batches:", batches);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching roasting batches:", error);
      res.status(500).json({ message: "Failed to fetch roasting batches" });
    }
  });

  app.post(
    "/api/roasting-batches",
    requireRole(["roaster", "roasteryOwner"]),
    async (req, res) => {
      try {
        const data = insertRoastingBatchSchema.parse(req.body);
        const batch = await storage.createRoastingBatch({
          ...data,
          roasterId: req.user!.id,
        });

        // Update green coffee stock
        const coffee = await storage.getGreenCoffee(data.greenCoffeeId);
        if (coffee) {
          const newStock = Number(coffee.currentStock) - Number(data.greenCoffeeAmount);
          await storage.updateGreenCoffeeStock(
            coffee.id,
            newStock
          );
        }

        res.status(201).json(batch);
      } catch (error) {
        console.error("Error creating roasting batch:", error);
        res.status(400).json({ 
          message: error instanceof Error ? error.message : "Failed to create roasting batch",
          details: error instanceof Error ? error.stack : undefined
        });
      }
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

  app.post("/api/dispatched-coffee/confirm", requireRole(["roasteryOwner", "shopManager", "barista"]), async (req, res) => {
    try {
      const { confirmationId, receivedSmallBags, receivedLargeBags } = req.body;
      console.log("Received confirmation request:", {
        user: req.user?.username,
        role: req.user?.role,
        confirmationId,
        receivedSmallBags,
        receivedLargeBags
      });

      if (!confirmationId) {
        return res.status(400).json({ message: "Confirmation ID is required" });
      }

      // Validate quantities
      if (typeof receivedSmallBags !== 'number' || receivedSmallBags < 0) {
        return res.status(400).json({ message: "Invalid received small bags quantity" });
      }
      if (typeof receivedLargeBags !== 'number' || receivedLargeBags < 0) {
        return res.status(400).json({ message: "Invalid received large bags quantity" });
      }

      // Get the confirmation details
      const existingConfirmations = await storage.getAllDispatchedCoffeeConfirmations();
      const existingConfirmation = existingConfirmations.find(c => c.id === confirmationId);

      if (!existingConfirmation) {
        return res.status(404).json({ message: "Confirmation not found" });
      }

      // For non-roasteryOwner users, verify shop access
      if (req.user?.role !== "roasteryOwner") {
        const hasAccess = await checkShopAccess(req.user!.id, existingConfirmation.shopId);
        if (!hasAccess) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }
      }

      console.log("Processing confirmation:", {
        confirmationId,
        receivedSmallBags,
        receivedLargeBags,
        userId: req.user!.id,
        shopId: existingConfirmation.shopId
      });

      const confirmation = await storage.confirmDispatchedCoffee(confirmationId, {
        receivedSmallBags: Number(receivedSmallBags),
        receivedLargeBags: Number(receivedLargeBags),
        confirmedById: req.user!.id,
      });

      console.log("Confirmation processed successfully:", confirmation);
      res.json(confirmation);
    } catch (error) {
      console.error("Error confirming dispatched coffee:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to confirm dispatch",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Inventory Discrepancies Routes
  app.get("/api/inventory-discrepancies", requireRole(["roaster", "roasteryOwner"]), async (req, res) => {
    try {
      console.log("Fetching discrepancies for user:", req.user?.username, "with role:", req.user?.role);
      const discrepancies = await storage.getInventoryDiscrepancies();
      console.log("Found discrepancies:", discrepancies.length);
      res.json(discrepancies);
    } catch (error) {
      console.error("Error fetching inventory discrepancies:", error);
      res.status(500).json({ 
        message: "Failed to fetch discrepancies",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  // Add route for getting coffee-specific large bag targets
  app.get("/api/shops/:id/coffee-targets", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);

      if (!await checkShopAccess(req.user!.id, shopId)) {
        return res.status(403).json({ message: "User does not have access to this shop" });
      }

      const targets = await storage.getCoffeeLargeBagTargets(shopId);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching coffee targets:", error);
      res.status(500).json({ message: "Failed to fetch coffee targets" });
    }
  });

  // Add route for updating coffee-specific large bag target
  app.patch("/api/shops/:shopId/coffee/:coffeeId/target", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const coffeeId = parseInt(req.params.coffeeId);
      const { desiredLargeBags } = req.body;

      // Validate inputs
      if (typeof desiredLargeBags !== 'number' || desiredLargeBags < 0) {
        return res.status(400).json({ message: "Invalid desired large bags value" });
      }

      // For non-roasteryOwner users, verify shop access
      if (req.user?.role !== "roasteryOwner") {
        const hasAccess = await checkShopAccess(req.user!.id, shopId);
        if (!hasAccess) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }
      }

      const target = await storage.updateCoffeeLargeBagTarget(
        shopId,
        coffeeId,
        desiredLargeBags
      );

      console.log("Updated coffee target for shop:", shopId, "coffee:", coffeeId, "to:", desiredLargeBags);
      res.json(target);
    } catch(error) {
      console.error("Error updating coffee target:", error);
      res.status(500).json({ message: "Failed to update coffee target" });    }
  });

  // Add new billing routes after theexisting ones
  app.get("/api/billing/lastevent", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      const lastEvent = await storage.getLastBillingEvent();
      res.json(lastEvent);
    } catch (error) {
      console.error("Error fetching last billing event:", error);
      res.status(500).json({ message: "Failed to fetch last billing event" });
    }
  });

  app.get("/api/billing/quantities", requireRole(["roasteryOwner", "shopManager"]), async (req, res) => {
    try {
      console.log("Fetching billing quantities...");

      // Get the last billing event to determine the start date
      const lastEvent = await storage.getLastBillingEvent();
      const fromDate = lastEvent ? lastEvent.cycleEndDate : new Date(0); // Use epoch if no previous event

      console.log("Using fromDate:", fromDate);

      // Get quantities since last billing event
      const quantities = await storage.getBillingQuantities(fromDate);
      console.log("Retrieved quantities:", quantities);

      // Send response with both fromDate and quantities
      res.json({
        fromDate: fromDate.toISOString(),
        quantities: quantities
      });
    } catch (error) {
      console.error("Error in /api/billing/quantities:", error);
      res.status(500).json({ 
        message: "Failed to fetch billing quantities",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/billing/events", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const { primarySplitPercentage, secondarySplitPercentage, quantities } = req.body;

      // Get the last billing event to determine the cycle start date
      const lastEvent = await storage.getLastBillingEvent();
      const cycleStartDate = lastEvent ? lastEvent.cycleEndDate : new Date(0);
      const cycleEndDate = new Date(); // Current time

      // Create the billing event
      const event = await storage.createBillingEvent(
        {
          cycleStartDate,
          cycleEndDate,
          primarySplitPercentage,
          secondarySplitPercentage,
          createdById: req.user!.id
        },
        quantities.map((q: any) => ({
          grade: q.grade,
          smallBagsQuantity: q.smallBagsQuantity,
          largeBagsQuantity: q.largeBagsQuantity
        }))
      );

      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating billing event:", error);
      res.status(500).json({ message: "Failed to create billing event" });
    }
  });

  // Keep the existing code below
  const httpServer = createServer(app);
  return httpServer;
}