// Worker process entry point - sets up the Express app without starting the server
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import path from "path";

import { connectDB } from "./lib/db.js";
import "./lib/passport.js"; // Initialize passport strategies

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import fileRoutes from "./routes/file.route.js";
import fileTestRoutes from "./routes/file-test.route.js";

// Import performance and rate limiting middleware
import { performanceMiddleware } from "./middleware/performanceMonitor.js";
import { apiRateLimit } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
const __dirname = path.resolve();

// Apply performance monitoring to all requests
app.use(performanceMiddleware);

// Apply global rate limiting
app.use(apiRateLimit);

app.use(express.json({ limit: '10mb' })); // Increase limit for image uploads
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", process.env.CLIENT_URL],
    credentials: true,
  })
);

// Session configuration for OAuth
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/file-test", fileTestRoutes);


// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    workerId: process.env.WORKER_ID || "unknown",
    pid: process.pid,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
}

// Connect to database
await connectDB();

export default app;