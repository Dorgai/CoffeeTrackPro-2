import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import { seedInitialData } from "./db";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";

async function createServer() {
  try {
    log("Starting server initialization...");
    const app = express();
    const port = process.env.PORT || 5000;

    // Basic middleware
    log("Setting up middleware...");
    app.use(cors({
      origin: true,
      credentials: true
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Set up session before auth
    log("Configuring session middleware...");
    app.use(session({
      secret: process.env.SESSION_SECRET || 'development_secret',
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

    // Set up authentication after session
    log("Setting up authentication...");
    setupAuth(app);

    // Seed initial data before setting up routes
    log("Starting database initialization...");
    try {
      await seedInitialData();
      log("Database initialization completed successfully");
    } catch (err) {
      log("Database initialization failed:", err);
      throw err;
    }

    log("Registering routes...");
    const httpServer = await registerRoutes(app);


    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error handler caught: ${status} - ${message}`);

      res.status(status).json({
        error: {
          message,
          status,
          timestamp: new Date().toISOString(),
        }
      });
    });

    // Bind to all network interfaces (0.0.0.0)
    httpServer.listen(port, "0.0.0.0", () => {
      log(`Server is running on http://0.0.0.0:${port}`);
    });

    return httpServer;
  } catch (error) {
    log(`Server initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

createServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});