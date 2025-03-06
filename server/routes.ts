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
    // For roasteryOwner and roaster, grant access to all shops
    const user = await storage.getUser(userId);
    if (user?.role === "roasteryOwner" || user?.role === "roaster") {
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
  app.get("/api/users", requireRole(["owner", "roasteryOwner"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role or status
  app.patch("/api/users/:id", requireRole(["owner", "roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role, isActive, defaultShopId } = req.body;

      // Don't allow owner/roasteryOwner to modify their own role
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

  // Add after update user role/status route
  app.post("/api/users/:id/approve", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Don't allow owner/roasteryOwner to modify their own role
      if (userId === req.user!.id) {
        return res.status(403).json({ message: "Cannot modify own user account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.approveUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to approve user" 
      });
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

  // User's Shops Management Routes
  app.get("/api/users/:id/shops", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userShops = await storage.getUserShops(userId);
      res.json(userShops);
    } catch (error) {
      console.error("Error fetching user's shops:", error);
      res.status(500).json({ message: "Failed to fetch user's shops" });
    }
  });

  app.post("/api/users/:id/shops", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { shopIds } = req.body;

      if (!Array.isArray(shopIds)) {
        return res.status(400).json({ message: "Shop IDs must be an array" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only allow assigning shops to baristas
      if (user.role !== "barista") {
        return res.status(400).json({ message: "Shop assignments are only allowed for barista users" });
      }

      // Verify all shops exist and are active
      for (const shopId of shopIds) {
        const shop = await storage.getShop(shopId);
        if (!shop || !shop.isActive) {
          return res.status(404).json({ message: `Shop ${shopId} not found or inactive` });
        }
      }

      // Remove all existing assignments
      await storage.removeAllUserShops(userId);

      // Add new assignments
      for (const shopId of shopIds) {
        await storage.assignUserToShop(userId, shopId);
      }

      const updatedShops = await storage.getUserShops(userId);
      res.json(updatedShops);
    } catch (error) {
      console.error("Error updating user's shops:", error);
      res.status(500).json({ message: "Failed to update user's shop assignments" });
    }
  });

  // User's Shops Route
  app.get("/api/user/shops", async (req, res) => {
    try {
      if (!req.user) {
        console.log("No user found in request");
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Fetching shops for user:", {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role
      });

      let shops;
      // Allow retail owners to see all shops like roastery owners
      if (req.user.role === "roasteryOwner" || req.user.role === "retailOwner") {
        // Roastery owners and retail owners can see all active shops
        console.log("Fetching all shops for roasteryOwner/retailOwner");
        shops = await storage.getShops();
        console.log("Found shops:", shops);
      } else {
        // Other roles get their assigned shops
        console.log("Fetching assigned shops for user");
        shops = await storage.getUserShops(req.user.id);
        console.log("Found assigned shops:", shops);
      }

      // Only return active shops
      const activeShops = shops.filter(shop => shop.isActive);
      console.log("Returning active shops:", activeShops);

      return res.json(activeShops);
    } catch (error) {
      console.error("Error in /api/user/shops:", error);
      return res.status(500).json({ 
        message: "Failed to fetch shops",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Shops Routes - accessible by roastery owner and shop manager
  app.get("/api/shops/:id", requireRole(["roasteryOwner", "shopManager", "barista", "retailOwner"]), async (req, res) => {
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

  app.get("/api/shops", requireRole(["roasteryOwner", "shopManager", "barista", "retailOwner"]), async (req, res) => {
    try {
      let shops;
      if (req.user?.role === "roasteryOwner") {
        shops = await storage.getShops();
      } else {
        shops = await storage.getUserShops(req.user!.id);
      }
      res.json(shops.filter(shop => shop.isActive));
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Failed to fetch shops" });
    }
  });

  app.post("/api/shops", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const data = insertShopSchema.parse(req.body);
      const shop = await storage.createShop(data);
      res.status(201).json(shop);
    } catch (error) {
      console.error("Error creating shop:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create shop" 
      });
    }
  });

  app.patch("/api/shops/:id", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const shop = await storage.getShop(shopId);

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const updatedShop = await storage.updateShop(shopId, req.body);
      res.json(updatedShop);
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Failed to update shop" });
    }
  });

  app.delete("/api/shops/:id", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const shop = await storage.getShop(shopId);

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const deletedShop = await storage.deleteShop(shopId);
      res.json(deletedShop);
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Failed to delete shop" });
    }
  });

  // Green Coffee Routes - accessible by roastery owner and roaster
  app.get("/api/green-coffee", requireRole(["owner", "roasteryOwner", "roaster", "retailOwner"]), async (req, res) => {
    try {
      console.log("Fetching green coffee list, requested by:", req.user?.username, "role:", req.user?.role);
      const coffees = await storage.getGreenCoffees();
      res.json(coffees);
    } catch (error) {
      console.error("Error fetching green coffee list:", error);
      res.status(500).json({ message: "Failed to fetch coffee list" });
    }
  });

  // Add new green coffee route
  app.post(
    "/api/green-coffee",
    requireRole(["owner", "roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        console.log("Creating new green coffee request received by:", req.user?.username, "with role:", req.user?.role);
        console.log("Request body:", req.body);

        // Process and validate the data
        const data = {
          ...req.body,
          currentStock: String(req.body.currentStock || 0),
          minThreshold: String(req.body.minThreshold || 0)
        };

        console.log("Processed data:", data);
        const validatedData = insertGreenCoffeeSchema.parse(data);
        const coffee = await storage.createGreenCoffee(validatedData);

        console.log("Successfully created green coffee:", coffee);
        res.status(201).json(coffee);
      } catch (error) {
        console.error("Error creating green coffee:", error);
        if (error.name === 'ZodError') {
          return res.status(400).json({
            message: "Validation error",
            details: error.errors
          });
        }
        res.status(400).json({
          message: error instanceof Error ? error.message : "Failed to create green coffee",
          details: error instanceof Error ? error.stack : undefined
        });
      }
    }
  );

  // Update endpoint for green coffee with proper roaster permissions
  app.patch(
    "/api/green-coffee/:id",
    requireRole(["owner", "roasteryOwner", "roaster"]),
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
  app.get("/api/green-coffee/:id", requireRole(["owner", "roasteryOwner", "roaster", "retailOwner"]), async (req, res) => {
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
  app.get("/api/roasting-batches", requireRole(["owner", "roasteryOwner", "roaster", "retailOwner"]), async (req, res) => {
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
    requireRole(["owner", "roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        const data = insertRoastingBatchSchema.parse({
          ...req.body,
          plannedAmount: String(req.body.plannedAmount),
          status: "planned"
        });

        const batch = await storage.createRoastingBatch(data);

        // Update green coffee stock
        const coffee = await storage.getGreenCoffee(data.greenCoffeeId);
        if (coffee) {
          const newStock = Number(coffee.currentStock) - Number(data.plannedAmount);
          await storage.updateGreenCoffeeStock(coffee.id, { currentStock: String(newStock) });
        }

        res.status(201).json(batch);
      } catch (error) {
        console.error("Error creating roasting batch:", error);
        res.status(400).json({
          message: error instanceof Error ? error.message : "Failed to create roasting batch"
        });
      }
    }
  );

  // Retail Inventory Routes - accessible by shop manager, barista and retail owner
  app.get("/api/retail-inventory", requireRole(["owner", "roasteryOwner", "roaster", "shopManager", "barista", "retailOwner"]), async (req, res) => {
    try {
      let shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
      console.log("Fetching retail inventory for user:", req.user?.username, "role:", req.user?.role, "shopId:", shopId);

      // For roasteryOwner, owner, roaster and retailOwner, return all inventories if no shopId provided
      if (["roaster", "roasteryOwner", "owner", "retailOwner"].includes(req.user?.role || "")) {
        console.log("Fetching all retail inventories");
        const allInventory = await storage.getAllRetailInventories();
        console.log("Found inventories:", allInventory.length);
        return res.json(allInventory);
      }

      // For shop manager and barista, require shopId
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
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

  app.post("/api/retail-inventory", requireRole(["shopManager", "barista", "retailOwner"]), async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // For retailOwner, bypass shop access check
      if (req.user?.role !== "retailOwner") {
        if (!await checkShopAccess(req.user!.id, shopId)) {
          return res.status(403).json({ message: "User does not have access to this shop" });
        }
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

  // Add new endpoint for inventory history
  app.get("/api/retail-inventory/history", requireRole(["shopManager", "barista", "roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

      // For roastery owner and retail owner, return all history if no shopId specified
      if (["roasteryOwner", "retailOwner"].includes(req.user?.role || "") && !shopId) {
        const allHistory = await storage.getAllRetailInventoryHistory();
        return res.json(allHistory);
      }

      // Barista and shop manager must provide shopId
      if (["barista", "shopManager"].includes(req.user?.role || "") && !shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      if (shopId) {
        // Skip shop access check for retail owner
        if (req.user?.role !== "retailOwner") {
          if (!await checkShopAccess(req.user!.id, shopId)) {
            return res.status(403).json({ message: "User does not have access to this shop" });
          }
        }

        const history = await storage.getRetailInventoryHistory(shopId);
        return res.json(history);
      }

      res.json([]);
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      res.status(500).json({ message: "Failed to fetch inventory history" });
    }
  });

  // Orders Routes - accessible by retail owner
  app.get("/api/orders", requireRole(["retailOwner", "owner", "roasteryOwner", "roaster", "shopManager", "barista"]), async (req, res) => {
    try {
      console.log("Fetching orders for user:", req.user?.username, "with role:", req.user?.role);
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

      // For retailOwner, roaster, roasteryOwner, and owner return all orders
      if (["retailOwner", "roaster", "roasteryOwner", "owner"].includes(req.user?.role || "")) {
        console.log("Fetching all orders for roaster/roasteryOwner/owner/retailOwner");
        const allOrders = await storage.getAllOrders();
        console.log("Found orders:", allOrders.length);
        return res.json(allOrders);
      }

      // For shop manager and barista, require shopId
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // Verify shop access
      if (!await checkShopAccess(req.user!.id, shopId)) {
        return res.status(403).json({ message: "User does not have access to this shop" });
      }

      const orders = await storage.getOrdersByShop(shopId);
      return res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Update order status
  app.patch(
    "/api/orders/:id/status",
    requireRole(["retailOwner", "owner", "roasteryOwner", "roaster", "shopManager", "barista"]),
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

        // Owner, retailOwner and roasteryOwner have full access to all status changes
        if (["owner", "retailOwner", "roasteryOwner"].includes(req.user?.role || "")) {
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
          }
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
  app.post("/api/orders", requireRole(["owner", "shopManager", "barista", "roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // Only check shop access for non-roastery owners and non-owners
      if (req.user?.role !== "roasteryOwner" && req.user?.role !== "owner" && !await checkShopAccess(req.user!.id, shopId)) {
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
  app.get("/api/dispatched-coffee/confirmations", requireRole(["shopManager", "barista", "roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const { shopId } = req.query;
      console.log("Request for confirmations received with shopId:", shopId);

      // For roasteryOwner, allow fetching without shopId to see all confirmations
      if (["roasteryOwner", "retailOwner"].includes(req.user?.role || "") && !shopId) {
        const allConfirmations = await storage.getAllDispatchedCoffeeConfirmations();
        console.log("Returning all confirmations for roasteryOwner:", allConfirmations);
        return res.json(allConfirmations);
      }

      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // For non-roasteryOwner users, verify shop access
      if (!["roasteryOwner", "retailOwner"].includes(req.user?.role || "")) {
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

  app.post("/api/dispatched-coffee/confirm", requireRole(["roasteryOwner", "shopManager", "barista", "retailOwner"]), async (req, res) => {
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
      if (!["roasteryOwner", "retailOwner"].includes(req.user?.role || "")) {
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
  app.get("/api/inventory-discrepancies", 
    requireRole(["roaster", "roasteryOwner", "shopManager"]), 
    async (req, res) => {
      try {
        console.log("Fetching discrepancies for user:", req.user?.username, "with role:", req.user?.role);
        const discrepancies = await storage.getInventoryDiscrepancies();
        console.log("Found discrepancies:", discrepancies.length);

        // Filter discrepancies based on user role
        if (req.user?.role === "shopManager") {
          // For shop managers, filter discrepancies to only show their shops
          const userShops = await storage.getUserShops(req.user.id);
          const shopIds = userShops.map(shop => shop.id);
          console.log("Shop manager shops:", shopIds);
          const filteredDiscrepancies = discrepancies.filter(
            d => shopIds.includes(d.shopId)
          );
          console.log("Filtered discrepancies for shop manager:", filteredDiscrepancies.length);
          return res.json(filteredDiscrepancies);
        }

        // For roasteryOwner and roaster, show all discrepancies
        console.log("Returning all discrepancies forroasteryOwner/roaster");
        res.json(discrepancies);
      } catch (error){
        console.error("Error fetching inventory discrepancies:", error);
        res.status(500).json({
          message: "Failed to fetch discrepancies",
          details: error instanceof Error ? error.message : undefined
        });
      }
    }
  );

  //  ////  // Add route for getting coffee-specific large bag targets
  app.get("/api/shops/:id/coffee-targets", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async(req, res) => {
    try {      const shopId = parseInt(req.params.id);

      if (!await checkShopAccess(req.user!.id, shopId)) {
        return res.status(403).json({ message: "User doesnot have access to this shop" });
      }

      const targets = await storage.getCoffeeLargeBagTargets(shopId);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching coffee targets:", error);
      res.status(500).json({ message: "Failed to fetch coffee targets" });
    }
  });  // Fixthe incorrect syntax in the coffee target update route
  app.patch("/api/shops/:shopId/coffee/:coffeeId/target", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const coffeeId = parseInt(req.params.coffeeId);
      const { desiredLargeBags } = req.body;

      // Validate inputs
      if (typeof desiredLargeBags !== 'number' || desiredLargeBags < 0) {
        return res.status(400).json({ message: "Invalid desired large bags value" });
      }

      // For non-roasteryOwner users, verify shop access
      if (!["roasteryOwner", "retailOwner"].includes(req.user?.role || "")) {
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
    } catch (error) {
      console.error("Error updating coffee target:", error);
      res.status(500).json({ message: "Failed to update coffee target" });
    }
  });

  //  // Add new billing routes after theexisting ones
  app.get("/api/billing/lastevent", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      const lastEvent = await storage.getLastBillingEvent();
      res.json(lastEvent);
    } catch (error) {
      console.error("Error fetching last billing event:", error);
      res.status(500).json({ message: "Failed to fetch last billing event" });
    }
  });

  app.get("/api/billing/quantities", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
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

  // Add billing history route
  app.get("/api/billing/history", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      console.log("Fetching billing history for user:", req.user?.username, "role:", req.user?.role);
      const history = await storage.getBillingHistory();
      console.log("Retrieved billing history:", history.length, "events");
      res.json(history);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  app.get("/api/billing/details/:eventId", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      console.log("Fetching billing details for event:", eventId, "user:", req.user?.username);
      const details = await storage.getBillingEventDetails(eventId);
      console.log("Retrieved billing details:", details);
      res.json(details);
    } catch (error) {
      console.error("Error fetching billing details:", error);
      res.status(500).json({ message: "Failed to fetch billing details" });
    }
  });

  // Add analytics routes for roastery owner
  app.get("/api/analytics/inventory", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();

      console.log("Fetching inventory analytics from", fromDate, "to", toDate);
      const inventoryHistory = await storage.getAnalyticsInventoryHistory(fromDate, toDate);
      res.json(inventoryHistory);
    } catch (error) {
      console.error("Error fetching inventory analytics:", error);
      res.status(500).json({
        message: "Failed to fetch inventory analytics",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  app.get("/api/analytics/orders", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();

      console.log("Fetching order analytics from", fromDate, "to", toDate);
      const orderAnalytics = await storage.getAnalyticsOrders(fromDate, toDate);
      res.json(orderAnalytics);
    } catch (error) {
      console.error("Error fetching order analytics:", error);
      res.status(500).json({
        message: "Failed to fetch order analytics",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  app.get("/api/analytics/roasting", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();

      console.log("Fetching roasting analytics from", fromDate, "to", toDate);
      const roastingAnalytics = await storage.getAnalyticsRoasting(fromDate, toDate);
      res.json(roastingAnalytics);
    } catch (error) {
      console.error("Error fetching roasting analytics:", error);
      res.status(500).json({
        message: "Failed to fetch roasting analytics",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  // Add reports routes for roastery owner
  app.get("/api/reports/inventory-status", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      console.log("Generating inventory status report");
      const report = await storage.generateInventoryStatusReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating inventory status report:", error);
      res.status(500).json({
        message: "Failed to generate inventory status report",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  app.get("/api/reports/shop-performance", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      console.log("Generating shop performance report");
      const report = await storage.generateShopPerformanceReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating shop performance report:", error);
      res.status(500).json({
        message: "Failed to generate shop performance report",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  app.get("/api/reports/coffee-consumption", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      console.log("Generating coffee consumption report");
      const report = await storage.generateCoffeeConsumptionReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating coffee consumption report:", error);
      res.status(500).json({
        message: "Failed to generate coffee consumption report",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  // Reports and Analytics Routes
  app.get("/api/reports/monthly", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      console.log("Fetching monthly reports for user:", req.user?.username, "role:", req.user?.role);
      const reports = await storage.getMonthlyReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching monthly reports:", error);
      res.status(500).json({ message: "Failed to fetch monthly reports" });
    }
  });

  app.get("/api/analytics/data", requireRole(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      console.log("Fetching analytics data for user:", req.user?.username, "role:", req.user?.role);
      const data = await storage.getAnalyticsData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Keep the existing code below
  const httpServer = createServer(app);
  return httpServer;
}