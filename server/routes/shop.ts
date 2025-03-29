import { Router } from "express";
import { storage } from "../storage";
import { insertShopSchema } from "@shared/schema";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const shops = await storage.getShops();
    res.json(shops);
  } catch (error) {
    logger.error("Error getting shops:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const shopData = insertShopSchema.parse(req.body);
    const shop = await storage.createShop(shopData);
    res.json(shop);
  } catch (error) {
    logger.error("Error creating shop:", error);
    res.status(400).json({ error: "Invalid shop data" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shopData = insertShopSchema.partial().parse(req.body);
    const shop = await storage.updateShop(id, shopData);
    res.json(shop);
  } catch (error) {
    logger.error("Error updating shop:", error);
    res.status(400).json({ error: "Invalid shop data" });
  }
});

export const shopRouter = router; 