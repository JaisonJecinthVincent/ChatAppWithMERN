// Queue cleaner to remove all stuck jobs
import { messageQueue, groupMessageQueue } from './src/lib/queue.js';

async function cleanQueues() {
  try {
    console.log('🧹 Cleaning all queues...');
    
    // Clean message queue with correct Bull API
    await messageQueue.clean(0, 'completed');
    await messageQueue.clean(0, 'active'); 
    await messageQueue.clean(0, 'delayed');
    await messageQueue.clean(0, 'failed');
    
    // Remove waiting jobs manually
    const waitingJobs = await messageQueue.getWaiting();
    for (const job of waitingJobs) {
      await job.remove();
    }
    
    // Clean group message queue  
    await groupMessageQueue.clean(0, 'completed');
    await groupMessageQueue.clean(0, 'active');
    await groupMessageQueue.clean(0, 'delayed'); 
    await groupMessageQueue.clean(0, 'failed');
    
    // Remove waiting jobs manually
    const groupWaitingJobs = await groupMessageQueue.getWaiting();
    for (const job of groupWaitingJobs) {
      await job.remove();
    }
    
    console.log('✅ All queues cleaned successfully');
    
    // Check queue status
    const messageWaiting = await messageQueue.getWaiting();
    const groupWaiting = await groupMessageQueue.getWaiting();
    
    console.log(`📊 Queue status after cleaning:`);
    console.log(`  Message queue: ${messageWaiting.length} waiting jobs`);
    console.log(`  Group queue: ${groupWaiting.length} waiting jobs`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning queues:', error);
    process.exit(1);
  }
}

cleanQueues();