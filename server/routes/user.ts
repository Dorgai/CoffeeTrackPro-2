import { Router } from "express";
import { storage } from "../storage";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    logger.error("Error getting users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await storage.updateUser(id, req.body);
    res.json(user);
  } catch (error) {
    logger.error("Error updating user:", error);
    res.status(400).json({ error: "Invalid user data" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteUser(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error);
    res.status(400).json({ error: "Error deleting user" });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await storage.approveUser(id);
    res.json(user);
  } catch (error) {
    logger.error("Error approving user:", error);
    res.status(400).json({ error: "Error approving user" });
  }
});

export const userRouter = router; 