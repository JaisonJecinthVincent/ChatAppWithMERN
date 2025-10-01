import redisManager from "../lib/redis.js";

// Rate limiting configuration
const RATE_LIMITS = {
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  messages: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 messages per minute
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
  }
};

// Generic rate limiter
export const createRateLimiter = (config) => {
  return async (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `rate_limit:${config.type}:${identifier}`;
      
      // Get current count
      const current = await redisManager.get(key);
      const count = current ? parseInt(current) : 0;
      
      if (count >= config.maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(config.windowMs / 1000)} seconds.`,
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      }
      
      // Increment counter
      if (count === 0) {
        // First request in window
        await redisManager.setex(key, Math.ceil(config.windowMs / 1000), '1');
      } else {
        await redisManager.incr(key);
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, config.maxRequests - count - 1),
        'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString()
      });
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If Redis fails, allow the request to continue
      next();
    }
  };
};

// Pre-configured rate limiters
export const apiRateLimit = createRateLimiter({
  type: 'api',
  ...RATE_LIMITS.api
});

export const messageRateLimit = createRateLimiter({
  type: 'messages',
  ...RATE_LIMITS.messages
});

export const authRateLimit = createRateLimiter({
  type: 'auth',
  ...RATE_LIMITS.auth
});

// Advanced rate limiter for authenticated users
export const userRateLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user._id.toString();
    const key = `rate_limit:user:${userId}`;
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 200; // 200 requests per minute for authenticated users
    
    const current = await redisManager.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'User rate limit exceeded. Please slow down.',
        retryAfter: 60
      });
    }
    
    if (count === 0) {
      await redisManager.setex(key, 60, '1');
    } else {
      await redisManager.incr(key);
    }
    
    next();
  } catch (error) {
    console.error('User rate limiting error:', error);
    next();
  }
};

// Socket.IO rate limiter
export const socketRateLimit = (socket, maxEventsPerMinute = 60) => {
  const key = `socket_rate_limit:${socket.id}`;
  const windowMs = 60 * 1000;
  
  return async (eventName) => {
    try {
      const current = await redisManager.get(key);
      const count = current ? parseInt(current) : 0;
      
      if (count >= maxEventsPerMinute) {
        socket.emit('rate_limit_exceeded', {
          message: 'Too many events. Please slow down.',
          retryAfter: 60
        });
        return false;
      }
      
      if (count === 0) {
        await redisManager.setex(key, 60, '1');
      } else {
        await redisManager.incr(key);
      }
      
      return true;
    } catch (error) {
      console.error('Socket rate limiting error:', error);
      return true; // Allow on error
    }
  };
};