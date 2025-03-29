import { Router } from "express";
import { storage } from "../storage";
import { insertGreenCoffeeSchema } from "@shared/schema";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const coffees = await storage.getGreenCoffees();
    res.json(coffees);
  } catch (error) {
    logger.error("Error getting green coffee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const coffeeData = insertGreenCoffeeSchema.parse(req.body);
    const coffee = await storage.createGreenCoffee(coffeeData);
    res.json(coffee);
  } catch (error) {
    logger.error("Error creating green coffee:", error);
    res.status(400).json({ error: "Invalid coffee data" });
  }
});

router.put("/:id/stock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { currentStock } = req.body;
    const coffee = await storage.updateGreenCoffeeStock(id, { currentStock });
    res.json(coffee);
  } catch (error) {
    logger.error("Error updating green coffee stock:", error);
    res.status(400).json({ error: "Invalid stock data" });
  }
});

export const greenCoffeeRouter = router; 