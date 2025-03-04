import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { seedInitialData } from "./db";

async function createServer() {
  try {
    // Check required environment variables
    const requiredEnvVars = ['DATABASE_URL', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGHOST'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    log('Starting server initialization...');
    const app = express();
    const port = process.env.PORT || 5000;

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

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
    log('Seeding initial data...');
    await seedInitialData();
    log('Initial data seeded successfully');

    log('Setting up routes...');
    const httpServer = await registerRoutes(app);

    log('Setting up Vite in development mode...');
    await setupVite(app, httpServer);

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

    // Start the server
    log(`Attempting to start server on port ${port}...`);

    return new Promise((resolve, reject) => {
      try {
        const server = httpServer.listen(port, "0.0.0.0", () => {
          log(`Server is running at http://0.0.0.0:${port}`);
          resolve(httpServer);
        });

        server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${port} is already in use`);
            reject(error);
          } else {
            log(`Server error: ${error.message}`);
            reject(error);
          }
        });
      } catch (err) {
        log(`Failed to start server: ${err instanceof Error ? err.message : String(err)}`);
        reject(err);
      }
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

createServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});