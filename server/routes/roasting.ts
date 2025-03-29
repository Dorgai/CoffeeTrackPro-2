import { Router } from "express";
import { storage } from "../storage";
import { insertRoastingBatchSchema } from "@shared/schema";
import { logger } from "../utils/logger";

const router = Router();

router.get("/batches", async (req, res) => {
  try {
    const batches = await storage.getRoastingBatches();
    res.json(batches);
  } catch (error) {
    logger.error("Error getting roasting batches:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/batches", async (req, res) => {
  try {
    const batchData = insertRoastingBatchSchema.parse(req.body);
    const batch = await storage.createRoastingBatch(batchData);
    res.json(batch);
  } catch (error) {
    logger.error("Error creating roasting batch:", error);
    res.status(400).json({ error: "Invalid batch data" });
  }
});

router.put("/batches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const batchData = insertRoastingBatchSchema.partial().parse(req.body);
    const batch = await storage.updateRoastingBatch(id, batchData);
    res.json(batch);
  } catch (error) {
    logger.error("Error updating roasting batch:", error);
    res.status(400).json({ error: "Invalid batch data" });
  }
});

export const roastingRouter = router; 