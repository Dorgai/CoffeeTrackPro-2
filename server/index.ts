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
    logger.info("Starting server initialization...");

    // Initialize database connection first
    await initializeDatabase();
    logger.info("Database initialized successfully");

    const app = express();
    const port = process.env.PORT || 5000;

    // Basic health check endpoint
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use(limiter);

    // CORS setup
    app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Middleware setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Session setup
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

    // Authentication setup
    setupAuth(app);

    // Register routes
    await registerRoutes(app);

    // Global error handler
    app.use(errorHandler);

    // Start HTTP server
    const httpServer = app.listen(Number(port), "0.0.0.0", () => {
      logger.info(`Server is running on http://0.0.0.0:${port}`);
    });

    // Set up Vite in development mode
    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
    }

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      await cleanupDatabase();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    logger.info("Server initialization completed successfully");
    return httpServer;
  } catch (error) {
    logger.error("Server initialization failed:", error);
    throw error;
  }
}

// Start the server
createServer().catch(error => {
  logger.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});