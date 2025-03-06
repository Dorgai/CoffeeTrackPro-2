import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { setupVite } from "./vite";
import { seedInitialData } from "./db";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

async function createServer() {
  console.log("Starting server initialization...");

  const app = express();
  const port = process.env.PORT || 5000;

  console.log("Configuring middleware...");

  // Configure CORS to handle credentials
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  console.log("CORS middleware configured");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  console.log("Setting up session store...");
  // Set up session before auth
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
  console.log("Session store configured");

  console.log("Setting up authentication...");
  // Set up authentication after session
  setupAuth(app);
  console.log("Authentication setup complete");

  console.log("Registering API routes...");
  // Register API routes
  await registerRoutes(app);
  console.log("API routes registered");

  console.log("Seeding initial data...");
  // Seed initial data before setting up routes
  try {
    await seedInitialData();
    console.log("Initial data seeding complete");
  } catch (error) {
    console.error("Error seeding initial data:", error);
    // Continue server startup even if seeding fails
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error in global error handler:", err);
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
  // Create HTTP server
  const httpServer = app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });

  // Set up Vite in development mode
  if (app.get("env") === "development") {
    console.log("Setting up Vite for development...");
    await setupVite(app, httpServer);
    console.log("Vite setup complete");
  }

  return httpServer;
}

createServer().catch(error => {
  console.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
  process.exit(1);
});