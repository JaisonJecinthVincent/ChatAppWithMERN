import Redis from 'ioredis';
import { enhancedRedisConfig } from '../config/redis.config.js';

// Create Redis client with enhanced configuration
const redis = new Redis(enhancedRedisConfig);

// Create separate client for blocking operations
const blockingRedis = new Redis({
  ...enhancedRedisConfig,
  commandTimeout: 30000, // Longer timeout for blocking operations
});

// Connection pool for concurrent operations
class RedisPool {
  constructor(size = 10) {
    this.pool = [];
    this.size = size;
    this.createPool();
  }

  createPool() {
    for (let i = 0; i < this.size; i++) {
      const client = new Redis({
        ...enhancedRedisConfig,
        connectionName: `pool_client_${i}`,
      });
      this.pool.push(client);
    }
  }

  getClient() {
    // Simple round-robin selection
    const client = this.pool.shift();
    this.pool.push(client);
    return client;
  }

  async closePool() {
    await Promise.all(this.pool.map(client => client.quit()));
  }
}

// Create connection pool
const redisPool = new RedisPool(parseInt(process.env.REDIS_POOL_SIZE) || 10);

// Handle Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
  // Set Redis configuration for better performance
  redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
  redis.config('SET', 'tcp-keepalive', '60');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

blockingRedis.on('connect', () => {
  console.log('✅ Blocking Redis client connected');
});

blockingRedis.on('error', (err) => {
  console.error('❌ Blocking Redis error:', err);
});

// Enhanced Redis operations for scalability
class RedisManager {
  constructor() {
    this.redis = redis;
    this.blockingRedis = blockingRedis;
    this.pool = redisPool;
    this.isConnected = false;
    
    // Check connection status
    this.redis.on('ready', () => {
      this.isConnected = true;
    });
    
    this.redis.on('close', () => {
      this.isConnected = false;
    });
    
    this.redis.on('error', () => {
      this.isConnected = false;
    });
  }

  // Fallback when Redis is not available
  _handleRedisError(operation, error) {
    console.warn(`Redis ${operation} failed, falling back to memory/skip:`, error.message);
    return null;
  }

  // High-performance operations using connection pool
  async get(key) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.get(key);
    } catch (error) {
      return this._handleRedisError('get', error);
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      if (ttl) {
        return await client.setex(key, ttl, value);
      }
      return await client.set(key, value);
    } catch (error) {
      return this._handleRedisError('set', error);
    }
  }

  async setex(key, seconds, value) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.setex(key, seconds, value);
    } catch (error) {
      return this._handleRedisError('setex', error);
    }
  }

  async mget(keys) {
    try {
      if (!this.isConnected) return keys.map(() => null);
      const client = this.pool.getClient();
      return await client.mget(keys);
    } catch (error) {
      return this._handleRedisError('mget', error);
    }
  }

  async mset(keyValuePairs) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.mset(keyValuePairs);
    } catch (error) {
      return this._handleRedisError('mset', error);
    }
  }

  async del(keys) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.del(keys);
    } catch (error) {
      return this._handleRedisError('del', error);
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) return 0;
      const client = this.pool.getClient();
      return await client.exists(key);
    } catch (error) {
      return this._handleRedisError('exists', error);
    }
  }

  async incr(key) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.incr(key);
    } catch (error) {
      return this._handleRedisError('incr', error);
    }
  }

  async expire(key, seconds) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.expire(key, seconds);
    } catch (error) {
      return this._handleRedisError('expire', error);
    }
  }

  // Hash operations for user sessions and presence
  async hset(key, field, value) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.hset(key, field, value);
    } catch (error) {
      return this._handleRedisError('hset', error);
    }
  }

  async hget(key, field) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.hget(key, field);
    } catch (error) {
      return this._handleRedisError('hget', error);
    }
  }

  async hgetall(key) {
    try {
      if (!this.isConnected) return {};
      const client = this.pool.getClient();
      return await client.hgetall(key);
    } catch (error) {
      return this._handleRedisError('hgetall', error);
    }
  }

  async hdel(key, fields) {
    try {
      if (!this.isConnected) return null;
      const client = this.pool.getClient();
      return await client.hdel(key, fields);
    } catch (error) {
      return this._handleRedisError('hdel', error);
    }
  }

  async hexists(key, field) {
    try {
      if (!this.isConnected) return 0;
      const client = this.pool.getClient();
      return await client.hexists(key, field);
    } catch (error) {
      return this._handleRedisError('hexists', error);
    }
  }

  // Set operations for online users and groups
  async sadd(key, members) {
    const client = this.pool.getClient();
    return await client.sadd(key, members);
  }

  async srem(key, members) {
    const client = this.pool.getClient();
    return await client.srem(key, members);
  }

  async smembers(key) {
    const client = this.pool.getClient();
    return await client.smembers(key);
  }

  async sismember(key, member) {
    const client = this.pool.getClient();
    return await client.sismember(key, member);
  }

  async scard(key) {
    const client = this.pool.getClient();
    return await client.scard(key);
  }

  // Sorted set operations for message queues and leaderboards
  async zadd(key, score, member) {
    const client = this.pool.getClient();
    return await client.zadd(key, score, member);
  }

  async zrange(key, start, stop, withScores = false) {
    const client = this.pool.getClient();
    if (withScores) {
      return await client.zrange(key, start, stop, 'WITHSCORES');
    }
    return await client.zrange(key, start, stop);
  }

  async zrem(key, members) {
    const client = this.pool.getClient();
    return await client.zrem(key, members);
  }

  async zcard(key) {
    const client = this.pool.getClient();
    return await client.zcard(key);
  }

  // List operations for message queues
  async lpush(key, values) {
    const client = this.pool.getClient();
    return await client.lpush(key, values);
  }

  async rpush(key, values) {
    const client = this.pool.getClient();
    return await client.rpush(key, values);
  }

  async lpop(key) {
    const client = this.pool.getClient();
    return await client.lpop(key);
  }

  async rpop(key) {
    const client = this.pool.getClient();
    return await client.rpop(key);
  }

  async llen(key) {
    const client = this.pool.getClient();
    return await client.llen(key);
  }

  async lrange(key, start, stop) {
    const client = this.pool.getClient();
    return await client.lrange(key, start, stop);
  }

  async ltrim(key, start, stop) {
    const client = this.pool.getClient();
    return await client.ltrim(key, start, stop);
  }

  // Blocking operations using dedicated client
  async blpop(keys, timeout) {
    return await this.blockingRedis.blpop(keys, timeout);
  }

  async brpop(keys, timeout) {
    return await this.blockingRedis.brpop(keys, timeout);
  }

  // Pipeline operations for batch processing
  pipeline() {
    const client = this.pool.getClient();
    return client.pipeline();
  }

  // Lua script execution for atomic operations
  async eval(script, keys, args) {
    const client = this.pool.getClient();
    return await client.eval(script, keys.length, ...keys, ...args);
  }

  // Get raw Redis client for complex operations
  getClient() {
    return this.pool.getClient();
  }

  getRawRedis() {
    return this.redis;
  }

  // Health check
  async ping() {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  // Performance monitoring
  async getStats() {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');
      const stats = await this.redis.info('stats');
      
      return {
        info: info,
        memory: memory,
        stats: stats,
        poolSize: this.pool.size,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting Redis stats:', error);
      return null;
    }
  }

  // Cleanup
  async shutdown() {
    console.log('🛑 Shutting down Redis connections...');
    await this.pool.closePool();
    await this.redis.quit();
    await this.blockingRedis.quit();
  }
}

// Create singleton instance
const redisManager = new RedisManager();

// Initialize Redis connections
export const initializeRedis = async () => {
  try {
    console.log('🔄 Initializing Redis connections...');
    
    // Test main Redis connection
    const pingResult = await redisManager.ping();
    if (!pingResult) {
      throw new Error('Redis ping failed');
    }
    
    console.log('✅ Redis initialized successfully');
    return true;
  } catch (error) {
    console.warn('⚠️  Redis initialization failed:', error.message);
    console.log('📋 App will continue without Redis caching');
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisManager.shutdown();
  process.exit(0);
});

export default redisManager;
export { redis, blockingRedis, redisPool, RedisManager };



