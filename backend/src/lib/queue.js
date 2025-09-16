import Queue from 'bull';
import redis from './redis.js';
import Message from '../models/message.model.js';
import { getReceiverSocketId, io } from './socket.js';
import cloudinary from './cloudinary.js';

// Create message queue
const messageQueue = new Queue('message processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
  },
});

// Create notification queue
const notificationQueue = new Queue('notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
  },
});

// Create email queue (for future email notifications)
const emailQueue = new Queue('email notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Message processing job processor
messageQueue.process('process-message', async (job) => {
  const { messageData } = job.data;
  
  try {
    console.log(`Processing message job ${job.id} for user ${messageData.senderId}`);
    
    // Handle image upload if present
    let imageUrl;
    if (messageData.image) {
      const uploadResponse = await cloudinary.uploader.upload(messageData.image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create and save message
    const newMessage = new Message({
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      text: messageData.text,
      image: imageUrl,
    });

    await newMessage.save();
    
    // Update job progress
    job.progress(50);
    
    // Send real-time notification
    const receiverSocketId = getReceiverSocketId(messageData.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', newMessage);
    }
    
    job.progress(100);
    
    console.log(`✅ Message processed successfully: ${newMessage._id}`);
    return { messageId: newMessage._id, success: true };
    
  } catch (error) {
    console.error(`❌ Error processing message job ${job.id}:`, error);
    throw error;
  }
});

// Notification job processor
notificationQueue.process('send-notification', async (job) => {
  const { notificationData } = job.data;
  
  try {
    console.log(`Processing notification job ${job.id}`);
    
    // Send real-time notification via socket
    const receiverSocketId = getReceiverSocketId(notificationData.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('notification', {
        type: notificationData.type,
        message: notificationData.message,
        data: notificationData.data,
        timestamp: new Date(),
      });
    }
    
    console.log(`✅ Notification sent successfully`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error processing notification job ${job.id}:`, error);
    throw error;
  }
});

// Email notification job processor (placeholder for future implementation)
emailQueue.process('send-email', async (job) => {
  const { emailData } = job.data;
  
  try {
    console.log(`Processing email job ${job.id}`);
    
    // TODO: Implement email sending logic here
    // For now, just log the email data
    console.log('Email would be sent to:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('Body:', emailData.body);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ Email sent successfully`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error processing email job ${job.id}:`, error);
    throw error;
  }
});

// Queue event listeners for monitoring
messageQueue.on('completed', (job, result) => {
  console.log(`✅ Message job ${job.id} completed:`, result);
});

messageQueue.on('failed', (job, err) => {
  console.error(`❌ Message job ${job.id} failed:`, err.message);
});

messageQueue.on('stalled', (job) => {
  console.warn(`⚠️ Message job ${job.id} stalled`);
});

notificationQueue.on('completed', (job, result) => {
  console.log(`✅ Notification job ${job.id} completed:`, result);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Notification job ${job.id} failed:`, err.message);
});

emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed:`, result);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down queues...');
  await messageQueue.close();
  await notificationQueue.close();
  await emailQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down queues...');
  await messageQueue.close();
  await notificationQueue.close();
  await emailQueue.close();
  process.exit(0);
});

export { messageQueue, notificationQueue, emailQueue };
