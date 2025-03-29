import { Router } from "express";
import { storage } from "../storage";
import { insertRetailInventorySchema } from "@shared/schema";
import { logger } from "../utils/logger";

const router = Router();

router.get("/inventory", async (req, res) => {
  try {
    const shopId = req.query.shopId ? parseInt(req.query.shopId as string) : undefined;
    const inventories = await storage.getRetailInventories(shopId);
    res.json(inventories);
  } catch (error) {
    logger.error("Error getting retail inventory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const inventoryData = insertRetailInventorySchema.parse({
      ...req.body,
      updatedById: req.session.userId as number
    });
    const inventory = await storage.updateRetailInventory(inventoryData);
    res.json(inventory);
  } catch (error) {
    logger.error("Error updating retail inventory:", error);
    res.status(400).json({ error: "Invalid inventory data" });
  }
});

export const retailRouter = router; 