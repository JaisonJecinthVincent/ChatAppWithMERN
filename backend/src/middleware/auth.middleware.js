import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import redisManager from "../lib/redis.js";

// User cache TTL: 5 minutes (300 seconds)
const USER_CACHE_TTL = 300;

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const userId = decoded.userId;
    const cacheKey = `user_auth:${userId}`;
    
    try {
      // Try to get user from cache first
      const cachedUser = await redisManager.get(cacheKey);
      
      if (cachedUser) {
        console.log(`💾 Auth cache hit for user ${userId}`);
        req.user = JSON.parse(cachedUser);
        return next();
      }
      
      console.log(`💾 Cache miss - querying database for user ${userId}`);
    } catch (cacheError) {
      console.warn("Redis cache error, proceeding with database query:", cacheError.message);
    }

    // Fallback to database query
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cache the user for future requests
    try {
      await redisManager.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user));
      console.log(`💾 Cached user ${userId} for ${USER_CACHE_TTL} seconds`);
    } catch (cacheError) {
      console.warn("Failed to cache user data:", cacheError.message);
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to invalidate user cache (call when user data changes)
export const invalidateUserCache = async (userId) => {
  try {
    const cacheKey = `user_auth:${userId}`;
    await redisManager.del(cacheKey);
    console.log(`💾 Invalidated cache for user ${userId}`);
  } catch (error) {
    console.warn("Failed to invalidate user cache:", error.message);
  }
};
