#!/usr/bin/env node

/**
 * Redis Startup Check Script
 * 
 * This script checks if Redis is running and provides helpful information
 * for setting up the message queue system.
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

async function checkRedisConnection() {
  console.log('🔍 Checking Redis connection...');
  console.log(`📍 Host: ${redisConfig.host}:${redisConfig.port}`);
  
  const client = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
    },
    password: redisConfig.password,
  });

  try {
    await client.connect();
    console.log('✅ Redis connection successful!');
    
    // Test basic operations
    await client.set('test:connection', 'success');
    const result = await client.get('test:connection');
    await client.del('test:connection');
    
    if (result === 'success') {
      console.log('✅ Redis read/write operations working!');
    }
    
    // Get Redis info
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`📦 Redis version: ${versionMatch[1]}`);
    }
    
    console.log('\n🎉 Redis is ready for message queues!');
    console.log('\nNext steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Check queue health: GET /api/messages/queue/health');
    console.log('3. Monitor queues: GET /api/messages/queue/metrics');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Redis server is running: redis-server');
    console.log('2. Check your Redis configuration in .env file');
    console.log('3. Verify Redis is accessible on the specified host/port');
    console.log('4. Check firewall settings if using remote Redis');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Try starting Redis:');
      console.log('   - Windows: Download Redis from https://redis.io/download');
      console.log('   - macOS: brew install redis && brew services start redis');
      console.log('   - Linux: sudo apt-get install redis-server && sudo systemctl start redis');
    }
    
    process.exit(1);
  } finally {
    await client.quit();
  }
}

// Run the check
checkRedisConnection().catch(console.error);



