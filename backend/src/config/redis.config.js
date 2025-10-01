import dotenv from 'dotenv';

dotenv.config();

// Centralized Redis configuration - single source of truth
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
};

// Bull-compatible Redis options (minimal configuration)
export const bullRedisConfig = {
  redis: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    // Simplified settings for Bull compatibility
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: false,
  }
};

// Enhanced Redis configuration for general use
export const enhancedRedisConfig = {
  ...redisConfig,
  retryDelayOnFailover: 1000,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  family: 4,
  keepAlive: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  enableOfflineQueue: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  enableReadyCheck: true,
  maxLoadingTimeout: 5000,
  retryOptions: {
    retries: 3,
    delay: Math.min,
    randomize: false,
  },
  reconnectOnError: (err) => {
    console.log('Redis reconnect on error:', err.message);
    return err.message.includes('READONLY') || err.message.includes('ECONNRESET');
  },
};

export default redisConfig;