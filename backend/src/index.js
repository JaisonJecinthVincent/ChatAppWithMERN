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
import oauthRoutes from "./routes/oauth.route.js";
import fileRoutes from "./routes/file.route.js";
import fileTestRoutes from "./routes/file-test.route.js";

// Note: In clustered mode, app and server are handled by cluster.js -> app.js
// This file is kept for backward compatibility but not used in clustering

// Import performance and rate limiting middleware
import { performanceMiddleware, getHealthMetrics } from "./middleware/performanceMonitor.js";
import { apiRateLimit } from "./middleware/rateLimiter.js";

dotenv.config();

// Note: This file is not used in clustered mode
// The clustering architecture uses cluster.js -> app.js -> socket.js
// This file is kept for reference only

console.log("⚠️  index.js is deprecated in clustered mode. Use 'node cluster.js' instead.");

/*
// Legacy single-process code (disabled for clustering)

const app = express();
const PORT = process.env.PORT;
const __dirname = path.resolve();

// Apply performance monitoring to all requests
app.use(performanceMiddleware);

// Apply global rate limiting
app.use(apiRateLimit);

app.use(express.json({ limit: '10mb' })); // Increase limit for image uploads
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
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

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get("/health", async (req, res) => {
  const healthData = await getHealthMetrics();
  res.status(200).json(healthData);
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/file-test", fileTestRoutes);
app.use("/api/auth", oauthRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
*/
