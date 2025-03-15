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
  try {
    console.log("Comparing passwords");
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log("Password comparison result:", result);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export async function generateHashedPassword(password: string) {
  return hashPassword(password);
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

  // Configure passport local strategy with additional checks
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        console.log("Login attempt:", { username, found: !!user });

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // All admin roles (including roasteryOwner) should have unrestricted access
        const isAdminRole = ["owner", "roasteryOwner", "retailOwner"].includes(user.role);

        if (isAdminRole) {
          const isValid = await comparePasswords(password, user.password);
          console.log("Admin login validation:", { isValid });
          if (!isValid) {
            return done(null, false, { message: "Invalid username or password" });
          }
          return done(null, user);
        }

        // For non-admin roles, check approval and active status
        if (user.isPendingApproval) {
          return done(null, false, { message: "Your account is pending approval" });
        }

        if (!user.isActive) {
          return done(null, false, { message: "Your account has been deactivated" });
        }

        const isValid = await comparePasswords(password, user.password);
        console.log("User login validation:", { isValid });
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", { id: user.id, role: user.role });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("Deserialized user:", { id: user.id, role: user.role });
      done(null, user);
    } catch (error) {
      console.error("Error during deserialization:", error);
      done(error);
    }
  });

  // Authentication routes with proper error handling
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // If trying to register as roasteryOwner, check if we already have 2 roastery owners
      if (req.body.role === "roasteryOwner") {
        const roasteryOwners = await storage.getUsersByRole("roasteryOwner");
        if (roasteryOwners.length >= 2) {
          return res.status(400).json({ message: "Maximum number of roastery owners (2) has been reached" });
        }
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isPendingApproval: req.body.role !== "roasteryOwner", // Roastery owners don't need approval
        isActive: req.body.role === "roasteryOwner" // Roastery owners are active by default
      });

      // Don't automatically log in new users since they need approval (except roasteryOwner)
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({
        ...userWithoutPassword,
        message: user.role === "roasteryOwner"
          ? "Registration successful. You can now log in."
          : "Registration successful. Please wait for approval from a roastery owner."
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password in response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Don't send password in response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}