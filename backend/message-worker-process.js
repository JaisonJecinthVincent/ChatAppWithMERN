import { messageQueue, groupMessageQueue } from './src/lib/queue.js';
import { processDirectMessage, processGroupMessage } from './workers/messageWorker.js';

async function startWorker() {
    // Add Bull debug handlers for messageQueue
    messageQueue.on('error', (err) => {
      console.error('BULL QUEUE ERROR (messageQueue):', err);
    });
    messageQueue.on('stalled', (job) => {
      console.warn('STALLED JOB (messageQueue):', job.id, job.name);
    });
    messageQueue.on('waiting', (jobId) => {
      console.log('WAITING JOB (messageQueue):', jobId);
    });
    messageQueue.on('active', (job) => {
      console.log('ACTIVE JOB (messageQueue):', job.id, job.name);
    });
    messageQueue.on('failed', (job, err) => {
      console.error('FAILED JOB (messageQueue):', job.id, job.name, err);
    });
    messageQueue.on('completed', (job, result) => {
      console.log('COMPLETED JOB (messageQueue):', job.id, job.name, result);
    });

    // Add Bull debug handlers for groupMessageQueue
    groupMessageQueue.on('error', (err) => {
      console.error('BULL QUEUE ERROR (groupMessageQueue):', err);
    });
    groupMessageQueue.on('stalled', (job) => {
      console.warn('STALLED JOB (groupMessageQueue):', job.id, job.name);
    });
    groupMessageQueue.on('waiting', (jobId) => {
      console.log('WAITING JOB (groupMessageQueue):', jobId);
    });
    groupMessageQueue.on('active', (job) => {
      console.log('ACTIVE JOB (groupMessageQueue):', job.id, job.name);
    });
    groupMessageQueue.on('failed', (job, err) => {
      console.error('FAILED JOB (groupMessageQueue):', job.id, job.name, err);
    });
    groupMessageQueue.on('completed', (job, result) => {
      console.log('COMPLETED JOB (groupMessageQueue):', job.id, job.name, result);
    });
  try {
    console.log('🚀 Starting Message Worker...');
    console.log('📋 Environment: {');
    console.log(`  NODE_ENV: '${process.env.NODE_ENV}',`);
    console.log(`  REDIS_HOST: '${process.env.REDIS_HOST}',`);
    console.log(`  REDIS_PORT: '${process.env.REDIS_PORT}',`);
    console.log(`  MONGODB_URI: '${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}'`);
    console.log('}');

    console.log('⏳ Step 1: Connecting to database...');
    const { connectDB } = await import('./src/lib/db.js');
    await connectDB();
    console.log('✅ Worker: Database connected.');

    console.log('⏳ Step 2: Connecting to Redis...');
    const { initializeRedis } = await import('./src/lib/redis.js');
    await initializeRedis();
    console.log('✅ Worker: Redis connected.');

    console.log('⏳ Step 3: Setting up queue processors...');
    
    console.log('🔍 Queue debugging:');
    console.log(`  messageQueue name: "${messageQueue.name}"`);
    console.log(`  groupMessageQueue name: "${groupMessageQueue.name}"`);
    
    const messageQueueReady = await messageQueue.isReady();
    const groupMessageQueueReady = await groupMessageQueue.isReady();
    console.log(`${messageQueueReady ? '✅' : '❌'} messageQueue is ${messageQueueReady ? 'ready' : 'not ready'}`);
    console.log(`${groupMessageQueueReady ? '✅' : '❌'} groupMessageQueue is ${groupMessageQueueReady ? 'ready' : 'not ready'}`);

    try {
      console.log('🔍 Attempting to inspect direct message queue...');
      const waiting = await messageQueue.getWaiting();
      console.log(`📊 Found ${waiting.length} direct message jobs`);
      
      if (waiting.length > 0) {
        const firstJob = waiting[0];
        console.log(`  First job: ID=${firstJob.id}, Name="${firstJob.name}"`);
        console.log(`  First job data keys:`, Object.keys(firstJob.data || {}));
      }
    } catch (error) {
      console.error('❌ Error inspecting direct message queue:', error.message);
    }

    try {
      console.log('🔍 Attempting to inspect group message queue...');
      const groupWaiting = await groupMessageQueue.getWaiting();
      console.log(`📊 Found ${groupWaiting.length} group message jobs`);
      
      if (groupWaiting.length > 0) {
        const firstJob = groupWaiting[0];
        console.log(`  First job: ID=${firstJob.id}, Name="${firstJob.name}"`);
        console.log(`  First job data keys:`, Object.keys(firstJob.data || {}));
      }
    } catch (error) {
      console.error('❌ Error inspecting group message queue:', error.message);
    }
    
    // Set up processors for the ACTUAL job names we discovered
    console.log('🔧 Setting up processors for actual job names...');
    
    // Direct message processor (job name: "process-direct-message", data wrapped in messageData)
    messageQueue.process('process-direct-message', 5, async (job) => {
      console.log('🔥 JOB PICKED UP (process-direct-message):', job.id, job.name);
      console.log(`📋 Raw job data:`, JSON.stringify(job.data, null, 2));
      
      try {
        // Extract data from messageData wrapper
        const { messageData } = job.data;
        if (!messageData) {
          throw new Error('No messageData found in job');
        }
        
        console.log(`📋 Message data:`, JSON.stringify(messageData, null, 2));
        
        // Call the actual processing function with correct data structure
        const result = await processDirectMessage({ data: messageData, id: job.id });
        
        console.log(`✅ Direct message job ${job.id} completed successfully:`, result);
        return result;
      } catch (error) {
        console.error(`❌ Direct message job ${job.id} failed:`, error.message);
        throw error;
      }
    });
    
    // Group message processor (job name: "processGroupMessage", flat data structure)
    groupMessageQueue.process('processGroupMessage', 5, async (job) => {
      console.log('🔥 JOB PICKED UP (processGroupMessage):', job.id, job.name);
      console.log(`📋 Job data:`, JSON.stringify(job.data, null, 2));
      
      try {
        // Call the actual processing function with correct data structure
        const result = await processGroupMessage({ data: job.data, id: job.id });
        
        console.log(`✅ Group message job ${job.id} completed successfully:`, result);
        return result;
      } catch (error) {
        console.error(`❌ Group message job ${job.id} failed:`, error.message);
        throw error;
      }
    });
    
    console.log('✅ All processors set up');

    // Event logging
    messageQueue.on('waiting', (jobId) => {
      console.log(`📥 Direct message job ${jobId} is waiting to be processed`);
    });

    messageQueue.on('active', (job) => {
      console.log(`🔄 Direct message job ${job.id} started processing`);
    });

    messageQueue.on('completed', (job, result) => {
      console.log(`🎉 Direct message job ${job.id} completed successfully. Result:`, result);
    });

    messageQueue.on('failed', (job, err) => {
      console.error(`❌ Direct message job ${job.id} failed:`, err.message);
    });

    groupMessageQueue.on('waiting', (jobId) => {
      console.log(`📥 Group message job ${jobId} is waiting to be processed`);
    });

    groupMessageQueue.on('active', (job) => {
      console.log(`🔄 Group message job ${job.id} started processing`);
    });

    groupMessageQueue.on('completed', (job, result) => {
      console.log(`🎉 Group message job ${job.id} completed successfully. Result:`, result);
    });

    groupMessageQueue.on('failed', (job, err) => {
      console.error(`❌ Group message job ${job.id} failed:`, err.message);
    });

    console.log('✅ Message worker is listening for jobs on "process-direct-message" and "processGroupMessage" tasks.');
    console.log('🎯 Worker is fully initialized and ready to process jobs!');

  } catch (error) {
    console.error('💥 Worker initialization error:', error);
    process.exit(1);
  }
}

// Handle worker shutdown gracefully
process.on('SIGTERM', () => {
  console.log('⚠️ Worker received SIGTERM signal. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ Worker received SIGINT signal. Shutting down gracefully...');
  process.exit(0);
});

startWorker();