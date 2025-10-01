// Detailed Bull diagnostic test
import Bull from 'bull';
import { bullRedisConfig } from './src/config/redis.config.js';

console.log('🔍 Bull Diagnostic Test');
console.log('Redis config:', JSON.stringify(bullRedisConfig, null, 2));

const testQueue = new Bull('diagnostic-queue', bullRedisConfig);

// Test Redis connection first
testQueue.client.ping().then(result => {
  console.log('✅ Redis PING successful:', result);
}).catch(err => {
  console.error('❌ Redis PING failed:', err);
});

// Add comprehensive event listeners
testQueue.on('ready', () => {
  console.log('✅ Queue is ready');
});

testQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

testQueue.on('waiting', (jobId) => {
  console.log('⏳ Job waiting:', jobId);
});

testQueue.on('active', (job) => {
  console.log('🔥 Job became active:', job.id);
});

testQueue.on('completed', (job, result) => {
  console.log('✅ Job completed:', job.id, result);
});

testQueue.on('failed', (job, err) => {
  console.error('❌ Job failed:', job.id, err);
});

testQueue.on('stalled', (job) => {
  console.warn('⚠️ Job stalled:', job.id);
});

// Set up processor with detailed logging
console.log('📝 Setting up processor...');
testQueue.process('diagnostic-data', async (job) => {
  console.log('🎯 PROCESSOR CALLED! Job:', job.id, 'Data:', job.data);
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✨ PROCESSOR FINISHED! Job:', job.id);
  return { success: true, timestamp: new Date() };
});

console.log('✅ Processor set up complete');

// Wait a moment, then add job
setTimeout(async () => {
  try {
    console.log('➕ Adding diagnostic job...');
    const job = await testQueue.add('diagnostic-data', { 
      test: true, 
      timestamp: new Date(),
      nodeVersion: process.version 
    });
    console.log('✅ Job added successfully:', job.id);
    
    // Check queue status
    setTimeout(async () => {
      const waiting = await testQueue.getWaiting();
      const active = await testQueue.getActive();
      const completed = await testQueue.getCompleted();
      const failed = await testQueue.getFailed();
      
      console.log('📊 Queue status:');
      console.log(`  Waiting: ${waiting.length}`);
      console.log(`  Active: ${active.length}`);
      console.log(`  Completed: ${completed.length}`);
      console.log(`  Failed: ${failed.length}`);
      
      if (waiting.length > 0) {
        console.log('⚠️ Jobs are stuck in waiting state - processor not picking up jobs');
      }
      
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error adding job:', error);
    process.exit(1);
  }
}, 1000);