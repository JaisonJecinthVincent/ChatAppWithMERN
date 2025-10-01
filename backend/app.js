import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import path from "path";

import { connectDB } from "./src/lib/db.js";
import "./src/lib/passport.js"; // Initialize passport strategies
import "./src/lib/pubsub.js"; // Initialize pubsub manager for Redis subscriptions

import authRoutes from "./src/routes/auth.route.js";
import messageRoutes from "./src/routes/message.route.js";
import groupRoutes from "./src/routes/group.route.js";
import fileRoutes from "./src/routes/file.route.js";
import fileTestRoutes from "./src/routes/file-test.route.js";

dotenv.config();

const app = express();
const __dirname = path.resolve();

app.use(express.json({ limit: '10mb' })); 
app.use(cookieParser());
app.use(
  cors({
    origin: [process.env.CLIENT_URL || "http://localhost:5173"],
    credentials: true,
  })
);

// Session configuration for OAuth
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production" } 
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
  const frontendDistPath = path.join(__dirname, "frontend", "dist");
  app.use(express.static(frontendDistPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

// Connect to database
connectDB();

export default app;