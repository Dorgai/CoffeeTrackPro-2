import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { seedInitialData } from "./db";

async function createServer() {
  const app = express();
  const port = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Add request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  // Seed initial data before setting up routes
  await seedInitialData();

  const httpServer = await registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  }

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

  // Bind to all network interfaces (0.0.0.0)
  httpServer.listen(port, "0.0.0.0", () => {
    log(`Server is running on http://0.0.0.0:${port}`);
  });

  return httpServer;
}

createServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});