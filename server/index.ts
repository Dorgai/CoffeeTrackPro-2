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
  } else {
    //serveStatic(app);  // Removed as it's not in the edited code and unclear how to integrate.
  }

  httpServer.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use. Trying port ${port + 1}...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(port + 1, "0.0.0.0");
      }, 1000);
    } else {
      log(`Server error: ${error.message}`);
    }
  });

  httpServer.listen(port, "0.0.0.0", () => {
    log(`Server is running on port ${port}`);
  });

    // Global error handler (from original)
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


  return httpServer;
}

createServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});