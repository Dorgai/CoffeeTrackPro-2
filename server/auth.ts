import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Set up session before auth
  const sessionSettings: session.SessionOptions = {
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
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy with detailed logging
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Login attempt for username:", username);

        const user = await storage.getUserByUsername(username);
        console.log("User lookup result:", user ? { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          isActive: user.isActive,
          isPendingApproval: user.isPendingApproval
        } : "User not found");

        if (!user) {
          console.log("Authentication failed: User not found");
          return done(null, false, { message: "Invalid username or password" });
        }

        const isPasswordValid = await comparePasswords(password, user.password);
        console.log("Password validation result:", isPasswordValid);

        if (!isPasswordValid) {
          console.log("Authentication failed: Invalid password");
          return done(null, false, { message: "Invalid username or password" });
        }

        // All admin roles (including retailOwner) should have unrestricted access
        const isAdminRole = ["owner", "roasteryOwner", "retailOwner"].includes(user.role);

        if (isAdminRole) {
          console.log("Admin role detected, granting access");
          return done(null, user);
        }

        // For non-admin roles, check approval and active status
        if (user.isPendingApproval) {
          console.log("Authentication failed: Account pending approval");
          return done(null, false, { message: "Your account is pending approval" });
        }

        if (!user.isActive) {
          console.log("Authentication failed: Account inactive");
          return done(null, false, { message: "Your account has been deactivated" });
        }

        console.log("Authentication successful for user:", user.username);
        return done(null, user);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", { id: user.id, username: user.username, role: user.role });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user ID:", id);
      const user = await storage.getUser(id);

      if (!user) {
        console.log("Deserialization failed: User not found:", id);
        return done(null, false);
      }

      console.log("Successfully deserialized user:", { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      });
      done(null, user);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error);
    }
  });

  // Authentication routes with detailed logging
  app.post("/api/login", (req, res, next) => {
    console.log("Login request received for username:", req.body.username);

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }

        console.log("Login successful for user:", user.username);
        // Don't send password in response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logout request received for user:", req.user?.username);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      console.log("Logout successful");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("User info request, authenticated:", req.isAuthenticated());
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Don't send password in response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}