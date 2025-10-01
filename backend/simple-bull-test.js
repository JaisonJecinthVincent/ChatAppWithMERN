// Simple working Bull queue test
import Bull from 'bull';
import { bullRedisConfig } from './src/config/redis.config.js';

console.log('🚀 Starting simple Bull test...');

// Create a test queue
const testQueue = new Bull('test-queue', bullRedisConfig);

// Set up processor BEFORE adding jobs
testQueue.process(async (job) => {
  console.log('✅ JOB PICKED UP:', job.id, job.data);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
  console.log('✅ JOB COMPLETED:', job.id);
  return { success: true, processedAt: new Date() };
});

// Add event listeners
testQueue.on('completed', (job, result) => {
  console.log('🎉 Job completed event:', job.id, result);
});

testQueue.on('failed', (job, err) => {
  console.error('❌ Job failed event:', job.id, err.message);
});

testQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

// Wait a moment for processor to be ready, then add a job
setTimeout(async () => {
  try {
    console.log('📤 Adding test job...');
    const job = await testQueue.add({ message: 'Hello Bull!', timestamp: new Date() });
    console.log('✅ Job added:', job.id);
    
    // Wait for processing
    setTimeout(() => {
      console.log('⏰ Test completed. Exiting...');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error adding job:', error);
    process.exit(1);
  }
}, 1000);