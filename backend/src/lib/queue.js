import Bull from 'bull';
import { bullRedisConfig } from '../config/redis.config.js';

// Server identification for scaling
const SERVER_ID = process.env.SERVER_ID || `server-${Math.random().toString(36).substring(7)}`;
console.log(`🚀 Queue system initialized for ${SERVER_ID}`);

// Create specialized queues for different types of operations using Bull-compatible config
export const messageQueue = new Bull('message processing', bullRedisConfig);
export const groupMessageQueue = new Bull('group message processing', bullRedisConfig);
export const imageProcessingQueue = new Bull('image processing', bullRedisConfig);
export const notificationQueue = new Bull('notification processing', bullRedisConfig);
export const emailQueue = new Bull('email processing', bullRedisConfig);

// Add error handling for all queues
const addQueueErrorHandling = (queue, queueName) => {
  queue.on('error', (error) => {
    console.error(`❌ ${queueName} Queue Error:`, error.message);
    if (error.message.includes('ECONNRESET')) {
      console.log(`🔄 ${queueName} Queue: Attempting to reconnect...`);
    }
  });
  
  queue.on('failed', (job, err) => {
    console.error(`❌ ${queueName} Job ${job.id} failed:`, err.message);
  });
  
  queue.on('stalled', (job) => {
    console.warn(`⚠️ ${queueName} Job ${job.id} stalled`);
  });
};

addQueueErrorHandling(messageQueue, 'Message');
addQueueErrorHandling(groupMessageQueue, 'Group Message');
addQueueErrorHandling(imageProcessingQueue, 'Image Processing');
addQueueErrorHandling(notificationQueue, 'Notification');
addQueueErrorHandling(emailQueue, 'Email');

// Performance monitoring
const queueStats = {
  messagesProcessed: 0,
  groupMessagesProcessed: 0,
  notificationsSent: 0,
  emailsSent: 0,
  errors: 0,
  startTime: Date.now(),
};

// Enhanced error handling and monitoring
const queues = [messageQueue, groupMessageQueue, imageProcessingQueue, notificationQueue, emailQueue];

queues.forEach((queue) => {
  // Global error handlers
  queue.on('error', (error) => {
    console.error(`[${SERVER_ID}] Queue ${queue.name} error:`, error);
    queueStats.errors++;
  });

  queue.on('waiting', (jobId) => {
    console.log(`[${SERVER_ID}] Job ${jobId} is waiting in ${queue.name}`);
  });

  queue.on('active', (job, jobPromise) => {
    console.log(`[${SERVER_ID}] Job ${job.id} started in ${queue.name}`);
  });

  queue.on('completed', (job, result) => {
    console.log(`[${SERVER_ID}] Job ${job.id} completed in ${queue.name}`);
  });

  queue.on('failed', (job, err) => {
    console.error(`[${SERVER_ID}] Job ${job.id} failed in ${queue.name}:`, err.message);
    queueStats.errors++;
  });

  queue.on('stalled', (job) => {
    console.warn(`[${SERVER_ID}] Job ${job.id} stalled in ${queue.name}`);
  });
});

// Queue health monitoring
export const getQueueStats = () => {
  const uptime = Date.now() - queueStats.startTime;
  return {
    ...queueStats,
    uptime,
    serverId: SERVER_ID,
    messagesPerMinute: (queueStats.messagesProcessed / (uptime / 60000)).toFixed(2),
    groupMessagesPerMinute: (queueStats.groupMessagesProcessed / (uptime / 60000)).toFixed(2),
    errorRate: ((queueStats.errors / (queueStats.messagesProcessed + queueStats.groupMessagesProcessed + queueStats.notificationsSent)) * 100).toFixed(2),
  };
};

// Queue cleanup and status
export const getQueueInfo = async () => {
  const info = {};
  
  for (const queue of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);
    
    info[queue.name] = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }
  
  return info;
};

// Graceful shutdown
export const closeQueues = async () => {
  await Promise.all(queues.map(queue => queue.close()));
  console.log('All queues closed');
};

// Initialize queues (for explicit initialization in apps)
export const initializeQueues = async () => {
  try {
    console.log(`[${SERVER_ID}] Initializing queue system...`);
    
    // Test Redis connection for all queues
    await Promise.all(queues.map(async (queue) => {
      try {
        await queue.isReady();
        console.log(`✅ Queue ${queue.name} ready`);
      } catch (error) {
        console.warn(`⚠️  Queue ${queue.name} not ready:`, error.message);
      }
    }));
    
    console.log(`✅ Queue system initialized with ${queues.length} queues`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to initialize queue system:`, error.message);
    return false;
  }
};

console.log(`[${SERVER_ID}] Queue system fully initialized with ${queues.length} queues`);
