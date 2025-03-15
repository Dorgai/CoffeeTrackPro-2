import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { createHash } from "crypto";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function comparePasswords(supplied: string, stored: string): boolean {
  const hashedSupplied = hashPassword(supplied);
  console.log("Password comparison:", {
    suppliedHash: hashedSupplied,
    storedHash: stored,
    match: hashedSupplied === stored
  });
  return hashedSupplied === stored;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'development_secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("[Auth] Login attempt:", { username });

        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log("[Auth] User not found:", username);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log("[Auth] User found:", { 
          id: user.id, 
          username: user.username,
          hasPassword: Boolean(user.password),
          passwordHash: hashPassword(password)
        });

        if (!user.password) {
          console.log("[Auth] No password set for user:", username);
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = comparePasswords(password, user.password);
        console.log("[Auth] Password validation:", { isValid });

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log("[Auth] Login successful:", { username });
        return done(null, user);
      } catch (error) {
        console.error("[Auth] Error during authentication:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("[Auth] Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log("[Auth] User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("[Auth] Deserialized user:", user.id);
      done(null, user);
    } catch (error) {
      console.error("[Auth] Deserialization error:", error);
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("[Auth] Login request received:", {
      body: {
        username: req.body.username,
        hasPassword: Boolean(req.body.password)
      },
      headers: {
        'content-type': req.get('content-type')
      }
    });

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Auth] Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log("[Auth] Login failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Session creation error:", err);
          return next(err);
        }

        console.log("[Auth] Login successful:", user.username);
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    console.log("[Auth] Logout request received:", username);

    req.logout((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return next(err);
      }
      console.log("[Auth] Logout successful:", username);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}