import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { setupVite } from "./vite";
import { seedInitialData } from "./db";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

async function createServer() {
  try {
    console.log("Starting server initialization...");
    const app = express();
    const port = process.env.PORT || 5000;

    console.log("Setting up CORS...");
    app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
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
      secret: process.env.SESSION_SECRET || 'development_secret',
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
      }
    }));

    console.log("Setting up authentication...");
    setupAuth(app);

    console.log("Registering routes...");
    await registerRoutes(app);

    console.log("Seeding initial data...");
    await seedInitialData();

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({
        error: {
          message,
          status,
          timestamp: new Date().toISOString(),
        }
      });
    });

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