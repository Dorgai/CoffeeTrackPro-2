import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { sql } from "drizzle-orm";
import { setupAuth, hashPassword } from "./auth"; // Added explicit import for hashPassword
import { 
  insertGreenCoffeeSchema, 
  insertRoastingBatchSchema, 
  insertOrderSchema, 
  insertShopSchema,
  insertRetailInventorySchema,
  orders,
  shops,
  users,
  greenCoffee,
  roastingBatches 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { WebSocketServer } from 'ws'; 
import { storage } from "./storage";
import { db } from "./db";

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log("Authorization failed: No user in request");
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }

    // Admin roles (owner, roasteryOwner, retailOwner) always have access
    if (["owner", "roasteryOwner", "retailOwner"].includes(req.user.role)) {
      console.log("Authorization granted for admin role:", req.user.role);
      return next();
    }

    if (!roles.includes(req.user.role)) {
      console.log("Authorization failed: User role", req.user.role, "not in allowed roles:", roles);
      return res.status(403).json({ message: "Unauthorized - Insufficient permissions" });
    }
    next();
  };
}

// Update shop access middleware to better handle admin roles and check body for POST requests
function requireShopAccess(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log("No user found in request");
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }

    console.log("Authorization check:", {
      path: req.path,
      method: req.method,
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      },
      allowedRoles,
      query: req.query,
      params: req.params,
      body: req.method === 'POST' ? req.body : undefined
    });

    // Admin roles (owner, roasteryOwner, retailOwner) always have access
    if (["owner", "roasteryOwner", "retailOwner"].includes(req.user.role)) {
      console.log("Granting full access for admin role:", req.user.role);
      return next();
    }

    // For non-admin roles, first check if the role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      console.log("Role not allowed:", req.user.role, "Allowed roles:", allowedRoles);
      return res.status(403).json({ message: "Unauthorized - Insufficient permissions" });
    }

    // Then check for shopId (required for non-admin roles)
    // For POST requests, check body first
    const shopId = req.method === 'POST' 
      ? (req.body.shopId || parseInt(req.params.shopId || req.query.shopId as string))
      : parseInt(req.params.shopId || req.query.shopId as string);

    if (!shopId) {
      console.log("Shop ID required for non-admin role:", req.user.role);
      return res.status(400).json({ message: "Shop ID is required" });
    }

    try {
      const hasAccess = await checkShopAccess(req.user.id, shopId);
      if (!hasAccess) {
        console.log("Shop access denied for user:", req.user.id, "shop:", shopId);
        return res.status(403).json({ message: "No access to this shop" });
      }
      next();
    } catch (error) {
      console.error("Error checking shop access:", error);
      res.status(500).json({ message: "Error checking shop access" });
    }
  };
}

// Update checkShopAccess function to better handle admin roles
async function checkShopAccess(userId: number, shopId: number): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      console.log("User not found:", userId);
      return false;
    }

    // Admin roles always have access
    if (["owner", "roasteryOwner", "retailOwner"].includes(user.role)) {
      console.log("Full access granted for admin role:", user.role);
      return true;
    }

    // For other roles, check userShops table
    const userShops = await storage.getUserShops(userId);
    const hasAccess = userShops.some(shop => shop.id === shopId);
    console.log("Shop access check result:", {
      userId,
      shopId,
      hasAccess,
      assignedShops: userShops.length
    });
    return hasAccess;
  } catch (error) {
    console.error("Error checking shop access:", error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  setupAuth(app);

  // Move registration route before other routes to avoid conflicts
  app.post("/api/register", async (req, res) => {
    try {
      console.log("Registration attempt:", {
        username: req.body.username,
        role: req.body.role
      });

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Registration failed: Username exists:", req.body.username);
        return res.status(400).json({ message: "Username already exists" });
      }

      // Remove await since hashPassword is synchronous
      const hashedPassword = hashPassword(req.body.password);
      const userData = {
        ...req.body,
        password: hashedPassword,
        isActive: true,
        isPendingApproval: req.body.role !== 'roasteryOwner' // New users need approval except roasteryOwner
      };

      console.log("Creating new user with role:", userData.role);
      const user = await storage.createUser(userData);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error("Auto-login failed after registration:", err);
          return res.status(500).json({ message: "Failed to log in after registration" });
        }
        console.log("Registration successful:", user.username);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to register user"
      });
    }
  });

  // Add debug endpoint at the top of the routes registration
  app.get("/api/debug-user", (req, res) => {
    console.log("Debug user info:", {
      authenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null,
      session: req.session
    });
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null
    });
  });

  // Add user management routes
  app.get("/api/users", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/users/:id/shops", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const shops = await storage.getUserShops(userId);
      res.json(shops);
    } catch (error) {
      console.error("Error getting user shops:", error);
      res.status(500).json({ message: "Failed to get user shops" });
    }
  });

  app.delete("/api/users/:id/shops/:shopId", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const shopId = parseInt(req.params.shopId);
      await storage.assignUserToShops(userId, []);
      res.json({ message: "User removed from shop" });
    } catch (error) {
      console.error("Error removing user from shop:", error);
      res.status(500).json({ message: "Failed to remove user from shop" });
    }
  });

  // Add route for updating user's shop assignments
  app.post("/api/users/:id/shops", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { shopIds } = req.body;

      if (!Array.isArray(shopIds)) {
        return res.status(400).json({ message: "shopIds must be an array" });
      }

      // Verify all shop IDs exist
      const allShops = await storage.getShops();
      const validShopIds = allShops.map(shop => shop.id);
      const invalidShopIds = shopIds.filter(id => !validShopIds.includes(id));

      if (invalidShopIds.length > 0) {
        return res.status(400).json({ 
          message: "Invalid shop IDs provided",
          invalidShopIds
        });
      }

      await storage.assignUserToShops(userId, shopIds);
      res.json({ message: "Shop assignments updated successfully" });
    } catch (error) {
      console.error("Error updating user shop assignments:", error);
      res.status(500).json({ message: "Failed to update shop assignments" });
    }
  });

  app.get("/api/users/:id", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.delete("/api/users/:id", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      await storage.updateUser(userId, { isActive: false });
      res.json({ message: "User deleted" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Add permanent deletion endpoint for roastery owners
  app.delete("/api/users/:id/permanent", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Prevent deleting roastery owners
      if (user.role === "roasteryOwner") {
        res.status(403).json({ message: "Cannot delete roastery owners" });
        return;
      }

      await storage.deleteUser(userId);
      res.json({ message: "User permanently deleted" });
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      res.status(500).json({ message: "Failed to permanently delete user" });
    }
  });

  // Add user approval endpoint
  app.post("/api/users/:id/approve", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      await storage.approveUser(userId);
      res.json({ message: "User approved successfully" });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  // User's Shops Management Routes
  //This route is already handled above.

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
      // For admin roles (roasteryOwner, owner, retailOwner), return all active shops
      if (["roasteryOwner", "owner", "retailOwner"].includes(req.user.role)) {
        console.log("Fetching all shops for admin role");
        shops = await storage.getShops();
      } else {
        console.log("Fetching assigned shops for non-admin user");
        shops = await storage.getUserShops(req.user.id);
      }

      // Filter to only active shops and sort by name
      const activeShops = shops
        .filter(shop => shop.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log("Returning active shops:", activeShops.length);
      return res.json(activeShops);
    } catch (error) {
      console.error("Error in /api/user/shops:", error);
      return res.status(500).json({
        message: "Failed to fetch shops",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add new endpoint for fetching all user-shop assignments
  app.get("/api/user-shop-assignments", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      console.log("Fetching all user-shop assignments");
      const assignments = await storage.getAllUserShopAssignments();
      console.log("Found assignments:", assignments.length);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user-shop assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Add bulk update endpoint with proper transaction handling
  app.post("/api/bulk-user-shop-assignments", requireRole(["roasteryOwner"]), async (req, res) => {
    try {
      const { assignments } = req.body;
      console.log("Processing bulk user-shop assignments:", assignments);

      if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: "Assignments must be an array" });
      }

      await storage.updateBulkUserShopAssignments(assignments);

      res.json({ message: "Assignments updated successfully" });
    } catch (error) {
      console.error("Error updating bulk assignments:", error);
      res.status(500).json({ message: "Failed to update assignments" });
    }
  });

  // Shops Routes - accessible by roastery owner and shop manager
  app.get("/api/shops", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const shops = await storage.getShops();
      res.json(shops);
    } catch (error) {
      console.error("Error getting shops:", error);
      res.status(500).json({ message: "Failed to get shops" });
    }
  });

  app.post("/api/shops", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const shop = await storage.createShop(req.body);
      res.status(201).json(shop);
    } catch (error) {
      console.error("Error creating shop:", error);
      res.status(400).json({ message: "Failed to create shop" });
    }
  });

  app.get("/api/shops/:id", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const shops = await storage.getShops();
      const shop = shops.find(s => s.id === shopId);
      if (!shop) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }
      res.json(shop);
    } catch (error) {
      console.error("Error getting shop:", error);
      res.status(500).json({ message: "Failed to get shop" });
    }
  });

  app.delete("/api/shops/:id", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      const shops = await storage.getShops();
      const shop = shops.find(s => s.id === shopId);
      if (!shop) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }
      await storage.updateShop(shopId, { isActive: false });
      res.json({ message: "Shop deleted" });
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Failed to delete shop" });
    }
  });

  // Green Coffee Routes - accessible by roastery owner and roaster
  app.get("/api/green-coffee", requireRole(["owner", "roasteryOwner", "roaster", "retailOwner", "shopManager", "barista"]), async (req, res) => {
    try {
      console.log("Fetching green coffee list, requested by:", req.user?.username, "role:", req.user?.role);
      const coffees = await storage.getGreenCoffees();
      res.json(coffees);
    } catch (error) {
      console.error("Error fetching green coffee list:", error);
      res.status(500).json({ message: "Failed to fetch coffee list" });
    }
  });

  // Add/update the green coffee creation endpoint
  app.post(
    "/api/green-coffee",
    requireRole(["owner", "roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        console.log("Creating new green coffee request received by:", req.user?.username, "with role:", req.user?.role);
        console.log("Request body:", req.body);

        // Ensure stock values are strings
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

        // Ensure stock values are strings
        const data = {
          ...req.body,
          currentStock: String(req.body.currentStock || coffee.currentStock),
          minThreshold: String(req.body.minThreshold || coffee.minThreshold)
        };

        console.log("Updating green coffee:", {
          coffeeId,
          updatedBy: req.user?.username,
          role: req.user?.role,
          updates: data
        });

        const updatedCoffee = await storage.updateGreenCoffeeStock(coffeeId, data);

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
  app.get("/api/green-coffee/:id", requireRole(["owner", "roasteryOwner", "roaster", "retailOwner", "shopManager", "barista"]), async (req, res) => {
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
  // Update retail inventory routes
  app.get("/api/retail-inventory",
    requireShopAccess(["shopManager", "barista", "retailOwner", "roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        console.log("Fetching retail inventory for user:", {
          userId: req.user?.id,
          username: req.user?.username,
          role: req.user?.role,
          requestedShopId: shopId
        });

        // For shopManager and barista, require shopId
        if (["shopManager", "barista"].includes(req.user?.role || "") && !shopId) {
          console.log("Shop ID required for role:", req.user?.role);
          return res.status(400).json({ message: "Shop ID is required" });
        }

        const inventory = await storage.getAllRetailInventories();
        console.log("Retrieved inventory items:", {
          count: inventory?.length || 0,
          sample: inventory?.[0]
        });

        if (!Array.isArray(inventory)) {
          console.error("Invalid inventory data structure received");
          return res.status(500).json({ message: "Error retrieving inventory data" });
        }

        // Filter by shop if shopId is provided
        const filteredInventory = shopId
          ? inventory.filter(item => item.shopId === shopId)
          : inventory;

        console.log("Filtered inventory count:", filteredInventory.length);
        res.json(filteredInventory);
      } catch (error) {
        console.error("Error fetching retail inventory:", error);
        res.status(500).json({
          message: "Failed to fetch inventory",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

  app.post("/api/retail-inventory",
    requireShopAccess(["shopManager", "barista", "retailOwner", "owner", "roaster", "roasteryOwner"]),
    async (req, res) => {
      try {
        const { shopId, greenCoffeeId, smallBags, largeBags, notes } = req.body;

        if (!shopId || !greenCoffeeId) {
          return res.status(400).json({ message: "Shop ID and Coffee ID are required" });
        }

        console.log("Processing retail inventory update request:", {
          body: req.body,
          user: req.user?.username,
          role: req.user?.role
        });

        // For retail owner, we don't need to check shop access as it's already handled by middleware
        const inventoryData = {
          shopId: Number(shopId),
          greenCoffeeId: Number(greenCoffeeId),
          smallBags: Number(smallBags),
          largeBags: Number(largeBags),
          updatedById: req.user!.id,
          updateType: "manual" as const,
          notes: notes || undefined
        };

        console.log("Validated inventory data:", inventoryData);

        const inventory = await storage.updateRetailInventory(inventoryData);
        res.status(201).json(inventory);
      } catch (error) {
        console.error("Error updating retail inventory:", error);
        res.status(400).json({
          message: error instanceof Error ? error.message : "Failed to update inventory",
          details: error instanceof Error ? error.stack : undefined
        });
      }
    });

  // Update roasting batch routes
  app.get("/api/roasting-batches",
    requireRole(["roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        const greenCoffeeId = req.query.greenCoffeeId ? Number(req.query.greenCoffeeId) : undefined;

        console.log("Fetching roasting batches for user:", {
          userId: req.user?.id,
          username: req.user?.username,
          role: req.user?.role,
          greenCoffeeId
        });

        // If greenCoffeeId is provided, filter by it and order by createdAt DESC
        const batches = await db
          .select()
          .from(roastingBatches)
          .where(greenCoffeeId ? eq(roastingBatches.greenCoffeeId, greenCoffeeId) : undefined)
          .orderBy(sql`${roastingBatches.createdAt} DESC`);

        console.log("Found roasting batches:", batches.length);
        res.json(batches);
      } catch (error) {
        console.error("Error fetching roasting batches:", error);
        res.status(500).json({
          message: "Failed to fetch roasting batches",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
  app.post(
    "/api/roasting-batches",
    requireRole(["roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        console.log("Creating roasting batch, requested by:", {
          userId: req.user?.id,
          username: req.user?.username,
          role: req.user?.role,
          data: req.body
        });

        const data = insertRoastingBatchSchema.parse({
          ...req.body,
          plannedAmount: String(req.body.plannedAmount),
          // Remove planned status, batch is completed when created
          status: "completed"
        });

        // Create the batch
        const batch = await storage.createRoastingBatch(data);
        console.log("Created roasting batch:", batch);

        // Update green coffee stock
        const coffee = await storage.getGreenCoffee(data.greenCoffeeId);
        if (!coffee) {
          throw new Error("Green coffee not found");
        }

        // Deduct the used amount from stock
        const newStock = Number(coffee.currentStock) - Number(data.plannedAmount);
        if (newStock < 0) {
          throw new Error("Insufficient green coffee stock");
        }

        await storage.updateGreenCoffeeStock(coffee.id, {
          currentStock: String(newStock)
        });
        console.log("Updated green coffee stock:", {
          coffeeId: coffee.id,
          oldStock: coffee.currentStock,
          newStock,
          batchId: batch.id
        });

        res.json(batch);
      } catch (error) {
        console.error("Error creating roasting batch:", error);
        res.status(400).json({
          message: error instanceof Error ? error.message : "Failed to create roasting batch"
        });
      }
    }
  );

  // Retail Inventory Routes - accessible by shop manager, barista and retail owner
  // app.post("/api/retail-inventory", ...); // This line is replaced above

  app.get("/api/retail-inventory",
    requireShopAccess(["shopManager", "barista", "retailOwner", "roasteryOwner", "roaster"]),
    async (req, res) => {
      try {
        const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
        console.log("Fetching retail inventory for user:", {
          userId: req.user?.id,
          username: req.user?.username,
          role: req.user?.role,
          requestedShopId: shopId
        });

        // For shopManager and barista, require shopId
        if (["shopManager", "barista"].includes(req.user?.role || "") && !shopId) {
          console.log("Shop ID required for role:", req.user?.role);
          return res.status(400).json({ message: "Shop ID is required" });
        }

        const inventory = await storage.getAllRetailInventories();
        console.log("Retrieved inventory items:", {
          count: inventory?.length || 0,
          sample: inventory?.[0]
        });

        if (!Array.isArray(inventory)) {
          console.error("Invalid inventory data structure received");
          return res.status(500).json({ message: "Error retrieving inventory data" });
        }

        // Filter by shop if shopId is provided
        const filteredInventory = shopId
          ? inventory.filter(item => item.shopId === shopId)
          : inventory;

        console.log("Filtered inventory count:", filteredInventory.length);
        res.json(filteredInventory);
      } catch (error) {
        console.error("Error fetching retail inventory:", error);
        res.status(500).json({message: "Failed tofetch inventory",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

  // Add new endpoint for inventory history
  app.get("/api/retail-inventory/history", requireShopAccess(["shopManager", "barista", "roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

      // For roastery owner and retail owner, return all history if no shopId specified
      if (["roasteryOwner", "retailOwner", "owner"].includes(req.user?.role || "") && !shopId) {
        const allHistory = await storage.getAllRetailInventoryHistory();
        return res.json(allHistory);
      }

      // Barista and shop manager must provide shopId
      if (["barista", "shopManager"].includes(req.user?.role || "") && !shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      if (shopId) {
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
      console.log("Filtering orders by shopId:", shopId);

      // For shopManager and barista, require shopId
      if (["shopManager", "barista"].includes(req.user?.role || "") && !shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      // If shopId provided, verify access
      if (shopId && !["roasteryOwner", "owner"].includes(req.user?.role || "")) {
        const hasAccess = await checkShopAccess(req.user!.id, shopId);
        if (!hasAccess) {
          return res.status(403).json({ message: "No access to this shop" });
        }
      }

      let query = db
        .select({
          id: orders.id,
          shopId: orders.shopId,
          greenCoffeeId: orders.greenCoffeeId,
          smallBags: orders.smallBags,
          largeBags: orders.largeBags,
          status: orders.status,
          createdAt: orders.createdAt,
          createdById: orders.createdById,
          updatedById: orders.updatedById,
          shopName: shops.name,
          shopLocation: shops.location,
          coffeeName: greenCoffee.name,
          producer: greenCoffee.producer,
          created_by: users.username,
          updated_by: sql<string | null>`(SELECT username FROM users WHERE id = ${orders.updatedById})`
        })
        .from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id))
        .leftJoin(greenCoffee, eq(orders.greenCoffeeId, greenCoffee.id))
        .leftJoin(users, eq(orders.createdById, users.id));

      // Add shop filter if shopId is provided
      if (shopId) {
        query = query.where(eq(orders.shopId, shopId));
      }

      // Add date filters if provided
      const fromDate = req.query.from as string;
      const toDate = req.query.to as string;

      if (fromDate) {
        query = query.where(sql`DATE(${orders.createdAt}) >= ${fromDate}`);
      }
      if (toDate) {
        query = query.where(sql`DATE(${orders.createdAt}) <= ${toDate}`);
      }

      // Always order by createdAt DESC
      query = query.orderBy(sql`${orders.createdAt} DESC`);

      const filteredOrders = await query;
      console.log(`Found ${filteredOrders.length} orders for shopId:`, shopId);

      // Filter out any orders with undefined shopId
      const validOrders = filteredOrders.filter(order => order.shopId !== undefined);
      console.log(`Filtered out ${filteredOrders.length - validOrders.length} orders with undefined shopId`);

      return res.json(validOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({
        message: "Failed to fetch orders",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update order status endpoint with corrected error handling and inventory update
  app.patch(
    "/api/orders/:id/status",
    requireRole(["retailOwner", "owner", "roasteryOwner", "roaster", "shopManager", "barista"]),
    async (req, res) => {
      try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        console.log("Order status update requested by:", {
          username: req.user?.username,
          role: req.user?.role,
          orderId,
          status
        });

        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        // Verify shop access for non-admin roles
        if (!["owner", "roasteryOwner"].includes(req.user?.role || "")) {
          const hasAccess = await checkShopAccess(req.user!.id, order.shopId);
          if (!hasAccess) {
            return res.status(403).json({ message: "No access to this shop's orders" });
          }
        }

        // Validate status changes based on user role
        if (["retailOwner", "barista"].includes(req.user?.role || "")) {
          // Retail owners and baristas can only mark as delivered
          if (status !== "delivered") {
            return res.status(403).json({
              message: "You can only mark orders as delivered"
            });
          }
        } else if (req.user?.role === "roaster") {
          // Roaster can only change status to roasted or dispatched
          if (!["roasted", "dispatched"].includes(status)) {
            return res.status(403).json({
              message: "Roasters can only change status to 'roasted' or 'dispatched'"
            });
          }
        }

        // Update order status
        const updatedOrder = await storage.updateOrderStatus(orderId, {
          status,
          updatedById: req.user!.id
        });

        // If status is set to "delivered", update inventory
        if (status === "delivered") {
          try {
            // Get current inventory
            const currentInventory = await storage.getRetailInventoryItem(order.shopId, order.greenCoffeeId);

            // Calculate new quantities
            const newSmallBags = (currentInventory?.smallBags || 0) + order.smallBags;
            const newLargeBags = (currentInventory?.largeBags || 0) + order.largeBags;

            // Update inventory with new quantities
            await storage.updateRetailInventory({
              shopId: order.shopId,
              greenCoffeeId: order.greenCoffeeId,
              smallBags: newSmallBags,
              largeBags: newLargeBags,
              updatedById: req.user!.id,
              updateType: "dispatch",
              notes: `Order #${orderId} delivered`
            });

            console.log("Updated inventory for delivered order:", {
              orderId,
              shopId: order.shopId,
              coffeeId: order.greenCoffeeId,
              newSmallBags,
              newLargeBags
            });
          } catch (error) {
            console.error("Error updating inventory for delivered order:", error);
            // Don't fail the order status update if inventory update fails
            // but log it for investigation
          }
        }

        res.json(updatedOrder);
      } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({
          message: "Failed to update order status",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );

  // Create new order
  app.post("/api/orders", requireShopAccess(["owner", "retailOwner", "shopManager", "barista"]), async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) {
        return res.status(400).json({ message: "Shop ID is required" });
      }

      console.log("Creating new order:", {
        user: req.user?.username,
        role: req.user?.role,
        shopId,
        body: req.body
      });

      const data = insertOrderSchema.parse({
        ...req.body,
        createdById: req.user!.id,
        status: "pending"
      });

      const order = await storage.createOrder(data);
      console.log("Order created successfully:", order);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to create order"
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
        console.log("Returning all discrepancies for roasteryOwner/roaster");
        res.json(discrepancies);
      } catch (error) {
        console.error("Error fetching inventory discrepancies:", error);
        res.status(500).json({
          message: "Failed to fetch discrepancies",
          details: error instanceof Error ? error.message : undefined
        });
      }
    }
  );

  //  ////  // Add route for getting coffee-specific large bag targets
  app.get("/api/shops/:id/coffee-targets", requireShopAccess(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);

      const targets = await storage.getCoffeeLargeBagTargets(shopId);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching coffee targets:", error);
      res.status(500).json({ message: "Failed to fetch coffee targets" });
    }
  });
  // Fixthe incorrect syntax in the coffee target update route
  app.patch("/api/shops/:shopId/coffee/:coffeeId/target", requireShopAccess(["roasteryOwner", "shopManager", "retailOwner"]), async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const coffeeId = parseInt(req.params.coffeeId);
      const { desiredLargeBags } = req.body;

      // Validate inputs
      if (typeof desiredLargeBags !== 'number' || desiredLargeBags < 0) {
        return res.status(400).json({ message: "Invalid desired large bags value" });
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

  // Add billing quantities route
  app.get("/api/billing/quantities", requireRole(["roasteryOwner", "retailOwner"]), async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      console.log("Fetching billing quantities:", { startDate, endDate });

      const quantities = await storage.getBillingQuantities(startDate, endDate);
      res.json(quantities);
    } catch (error) {
      console.error("Error fetching billing quantities:", error);
      res.status(500).json({ message: "Failed to fetch billing quantities" });
    }
  });

  // Remove the httpServer creation from here as it's already handled in index.ts
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Add after "/api/users/:id/shops" routes
}