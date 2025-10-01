import Redis from 'ioredis';
import { enhancedRedisConfig } from '../config/redis.config.js';

class Publisher {
  constructor() {
    this.redisClient = new Redis(enhancedRedisConfig);
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      this.redisClient.on('connect', () => {
        console.log('Publisher Redis connected for publishing');
        this.isConnected = true;
      });

      this.redisClient.on('error', (err) => {
        console.error('Publisher Redis error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('close', () => {
        console.log('Publisher Redis connection closed');
        this.isConnected = false;
      });

      await this.redisClient.ping();
      console.log('Publisher Redis connection established');
    } catch (error) {
      console.error('Failed to initialize Publisher:', error);
    }
  }

  async publish(channel, data) {
    try {
      if (!this.isConnected) {
        console.warn('Publisher Redis not connected, attempting to reconnect...');
        await this.redisClient.ping();
      }

      const message = JSON.stringify(data);
      await this.redisClient.publish(channel, message);
      console.log(`Published to channel ${channel}`);
    } catch (error) {
      console.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redisClient.quit();
      console.log('Publisher Redis connection closed');
    } catch (error) {
      console.error('Error closing Publisher Redis connection:', error);
    }
  }
}

// Create and export singleton instance for workers
const publisher = new Publisher();

export default publisher;