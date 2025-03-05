import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";

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

  // Set up session before auth
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
  setupAuth(app);

  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const httpServer = await registerRoutes(app);


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
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });

  return httpServer;
}

createServer().catch(error => {
  console.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});