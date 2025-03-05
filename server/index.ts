import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { setupVite } from "./vite";

async function createServer() {
  const app = express();
  const port = process.env.PORT || 5000;

  // Basic middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

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

  // Create HTTP server
  const httpServer = app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });

  // Set up Vite in development mode
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  }

  return httpServer;
}

createServer().catch(error => {
  console.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});