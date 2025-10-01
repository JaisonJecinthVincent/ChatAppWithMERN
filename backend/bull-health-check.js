// Simple Bull queue and Redis health check
import Bull from 'bull';
import { bullRedisConfig } from './src/config/redis.config.js';

const healthCheckQueue = new Bull('health-check', bullRedisConfig);

async function runHealthCheck() {
  try {
    // Add a test job
    const job = await healthCheckQueue.add({ test: 'ping' });
    console.log('Job added:', job.id);

    // Process the job
    healthCheckQueue.process(async (job) => {
      console.log('Processing job:', job.id, job.data);
      return { status: 'ok' };
    });

    // Listen for completion
    healthCheckQueue.on('completed', (job, result) => {
      console.log('Job completed:', job.id, result);
      process.exit(0);
    });

    // Listen for errors
    healthCheckQueue.on('error', (err) => {
      console.error('Queue error:', err);
      process.exit(1);
    });

    // Timeout in case nothing happens
    setTimeout(() => {
      console.error('Health check timed out.');
      process.exit(1);
    }, 10000);
  } catch (err) {
    console.error('Health check failed:', err);
    process.exit(1);
  }
}

runHealthCheck();
