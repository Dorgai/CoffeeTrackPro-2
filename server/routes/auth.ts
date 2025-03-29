import { Router } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });
    res.json({ message: "User registered successfully", user });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(400).json({ error: "Invalid registration data" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.userId = user.id;
    res.json({ user });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error("Logout error:", err);
      return res.status(500).json({ error: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

export const authRouter = router; 