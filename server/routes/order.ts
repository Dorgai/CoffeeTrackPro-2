import { Router } from "express";
import { storage } from "../storage";
import { insertOrderSchema } from "@shared/schema";
import { logger } from "../utils/logger";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const orderData = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder(orderData);
    res.json(order);
  } catch (error) {
    logger.error("Error creating order:", error);
    res.status(400).json({ error: "Invalid order data" });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, smallBags, largeBags, updatedById } = req.body;
    const order = await storage.updateOrderStatus(id, {
      status,
      smallBags,
      largeBags,
      updatedById
    });
    res.json(order);
  } catch (error) {
    logger.error("Error updating order status:", error);
    res.status(400).json({ error: "Invalid order data" });
  }
});

export const orderRouter = router; 