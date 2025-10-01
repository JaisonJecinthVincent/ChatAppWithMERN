import Redis from 'ioredis';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  connectTimeout: 5000,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryDelayOnFailover: 100,
};

async function checkRedisConnection() {
  console.log('🔍 Checking Redis connection...');
  
  const redis = new Redis(redisConfig);
  
  try {
    await redis.ping();
    console.log('✅ Redis is running and accessible');
    await redis.disconnect();
    return true;
  } catch (error) {
    console.log('❌ Redis is not accessible:', error.message);
    await redis.disconnect();
    return false;
  }
}

async function startRedisServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Attempting to start Redis server...');
    
    // Try different Redis executable locations for Windows
    const redisExecutables = [
      'redis-server',
      'redis-server.exe',
      'C:\\Program Files\\Redis\\redis-server.exe',
      'C:\\Redis\\redis-server.exe',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Redis', 'redis-server.exe'),
    ];

    let redisProcess = null;
    let executableFound = false;

    for (const executable of redisExecutables) {
      try {
        redisProcess = spawn(executable, [], {
          detached: true,
          stdio: 'pipe',
          windowsHide: true
        });

        redisProcess.on('error', (err) => {
          if (err.code === 'ENOENT') {
            console.log(`Redis executable not found: ${executable}`);
          } else {
            console.error(`Error starting Redis with ${executable}:`, err.message);
          }
        });

        redisProcess.on('spawn', () => {
          executableFound = true;
          console.log(`✅ Redis server started with executable: ${executable}`);
          
          // Wait a moment for Redis to fully start
          setTimeout(async () => {
            const isConnected = await checkRedisConnection();
            if (isConnected) {
              resolve(true);
            } else {
              resolve(false);
            }
          }, 3000);
        });

        // If spawn was successful, break the loop
        if (executableFound) break;

      } catch (error) {
        continue; // Try next executable
      }
    }

    if (!executableFound) {
      console.log('❌ Could not find Redis executable. Please install Redis or start it manually.');
      console.log('Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases');
      resolve(false);
    }
  });
}

async function ensureRedisRunning() {
  const isRunning = await checkRedisConnection();
  
  if (isRunning) {
    return true;
  }

  console.log('\n📋 Redis Setup Instructions:');
  console.log('1. Download Redis for Windows: https://github.com/microsoftarchive/redis/releases');
  console.log('2. Install Redis and add to PATH');
  console.log('3. Or run: redis-server in another terminal');
  console.log('4. Or use Docker: docker run -d -p 6379:6379 redis:alpine');
  console.log('\n⚠️  Starting application without Redis (limited functionality)');
  
  return false;
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureRedisRunning().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { checkRedisConnection, ensureRedisRunning };