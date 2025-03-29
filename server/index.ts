import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { setupVite } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { initializeDatabase, cleanupDatabase } from "./db";
import rateLimit from 'express-rate-limit';
import { DatabaseStorage } from "./storage";
import { authRouter } from "./routes/auth";
import { shopRouter } from "./routes/shop";
import { roastingRouter } from "./routes/roasting";
import { retailRouter } from "./routes/retail";
import { orderRouter } from "./routes/order";
import { greenCoffeeRouter } from "./routes/green-coffee";
import { userRouter } from "./routes/user";
import { errorHandler } from "./middleware/error-handler";
import { authMiddleware } from "./middleware/auth";
import { logger } from "./utils/logger";

async function createServer() {
  try {
    console.log("Starting server initialization...");

    // Initialize database connection first
    await initializeDatabase();

    const app = express();
    const port = process.env.PORT || 5000;

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use(limiter);

    console.log("Setting up CORS...");
    app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    console.log("Setting up middleware...");
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Basic health check endpoint
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    console.log("Setting up session...");
    app.use(session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

    console.log("Setting up authentication...");
    setupAuth(app);

    console.log("Registering routes...");
    await registerRoutes(app);

    // Routes
    app.use('/api/auth', authRouter);
    app.use('/api/shops', authMiddleware, shopRouter);
    app.use('/api/roasting', authMiddleware, roastingRouter);
    app.use('/api/retail', authMiddleware, retailRouter);
    app.use('/api/orders', authMiddleware, orderRouter);
    app.use('/api/green-coffee', authMiddleware, greenCoffeeRouter);
    app.use('/api/users', authMiddleware, userRouter);

    // Global error handler
    app.use(errorHandler);

    console.log("Starting HTTP server...");
    const httpServer = app.listen(Number(port), "0.0.0.0", () => {
      console.log(`Server is running on http://0.0.0.0:${port}`);
    });

    // Set up Vite in development mode
    if (app.get("env") === "development") {
      console.log("Setting up Vite for development...");
      await setupVite(app, httpServer);
    }

    console.log("Server initialization completed successfully");
    return httpServer;
  } catch (error) {
    console.error("Server initialization failed:", error);
    throw error;
  }
}

createServer().catch(error => {
  console.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});