import Redis from 'ioredis';
import { getReceiverSocketId } from './socket.js';

// Function to get Socket.IO instance dynamically
async function getSocketIO() {
  try {
    const socketModule = await import('./socket.js');
    return socketModule.io;
  } catch (error) {
    console.warn('Socket.IO not available:', error.message);
    return null;
  }
}

// Create Redis clients for pub/sub with better error handling  
const publisher = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 1000,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  connectTimeout: 5000,
  enableReadyCheck: true,
});

const subscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 1000,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  connectTimeout: 5000,
  enableReadyCheck: true,
});

class PubSubManager {
  constructor() {
    // Detect if we're in the main server process or worker process
    this.isMainServerProcess = !process.env.WORKER_ID && process.title !== 'message-worker-process';
    
    this.channels = {
      NEW_MESSAGE: 'new_message',
      GROUP_MESSAGE: 'group_message',
      USER_ONLINE: 'user_online',
      USER_OFFLINE: 'user_offline',
      TYPING: 'typing',
      TYPING_STOP: 'typing_stop',
      MESSAGE_READ: 'message_read',
      GROUP_NOTIFICATION: 'group_notification',
      NOTIFICATION: 'notification',
      USER_PRESENCE: 'user_presence',
    };

    this.init();
  }

  async init() {
    try {
      console.log(`PubSub Manager initializing in ${this.isMainServerProcess ? 'MAIN SERVER' : 'WORKER'} process`);
      
      // Only subscribe to Redis channels in the main server process
      if (!this.isMainServerProcess) {
        console.log('Skipping Redis subscription in worker process');
        return;
      }

      // Check if already connected
      if (subscriber.status === 'ready') {
        console.log('Redis Subscriber already connected');
      } else if (subscriber.status === 'connecting') {
        console.log('Redis Subscriber already connecting, waiting...');
        await new Promise(resolve => subscriber.once('ready', resolve));
      } else {
        await subscriber.connect();
        console.log('Redis Subscriber connected');
      }
      
      // Subscribe to all channels
      const channelList = Object.values(this.channels);
      await subscriber.subscribe(...channelList);
      console.log('Subscribed to all pub/sub channels in main server process');

      subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

    } catch (error) {
      console.error('Failed to initialize PubSub:', error);
    }
  }

  async publish(channel, data) {
    try {
      await publisher.publish(channel, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to publish to ${channel}:`, error);
      throw error;
    }
  }

  async handleMessage(channel, message) {
    try {
      console.log(`📨 PubSub received message on channel '${channel}' in ${this.isMainServerProcess ? 'MAIN SERVER' : 'WORKER'} process`);
      const data = JSON.parse(message);

      switch (channel) {
        case this.channels.NEW_MESSAGE:
          console.log(`🔄 Handling direct message: ${data.messageId}`);
          await this.handleNewMessage(data);
          break;
        case this.channels.GROUP_MESSAGE:
          console.log(`🔄 Handling group message: ${data.messageId}`);
          await this.handleGroupMessage(data);
          break;
        case this.channels.USER_ONLINE:
        case this.channels.USER_OFFLINE:
          await this.handleUserPresence(data);
          break;
        case this.channels.TYPING:
        case this.channels.TYPING_STOP:
          await this.handleTyping(data);
          break;
        case this.channels.MESSAGE_READ:
          await this.handleMessageRead(data);
          break;
        case this.channels.GROUP_NOTIFICATION:
          await this.handleGroupNotification(data);
          break;
        case this.channels.NOTIFICATION:
          await this.handleNotification(data);
          break;
        case this.channels.USER_PRESENCE:
          await this.handleUserPresenceUpdate(data);
          break;
        default:
          console.log(`Unhandled channel: ${channel}`, data);
      }
    } catch (error) {
      console.error(`Error handling message on channel ${channel}:`, error);
    }
  }

  async handleNewMessage(data) {
    // Only handle Socket.IO emissions in main server process
    if (!this.isMainServerProcess) {
      return;
    }

    const { messageId, senderId, receiverId, text, image, fileUrl, fileName, fileSize, fileType, mimeType, createdAt, senderInfo } = data;
    
    // Get socket IDs for sender and receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    const messageData = {
      _id: messageId,
      senderId: {
        _id: senderId,
        fullName: senderInfo.fullName,
        profilePic: senderInfo.profilePic,
      },
      receiverId,
      text,
      image,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      createdAt,
    };

    // Get Socket.IO instance
    const io = await getSocketIO();
    if (!io) {
      console.error('Socket.IO not available for message delivery');
      return;
    }

    // Send to receiver
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', messageData);
    }

    // Send to sender (for multi-device sync)
    if (senderSocketId) {
      io.to(senderSocketId).emit('newMessage', messageData);
    }

    console.log(`Direct message delivered: ${messageId} from ${senderId} to ${receiverId}`);
  }

  async handleGroupMessage(data) {
    // Only handle Socket.IO emissions in main server process
    if (!this.isMainServerProcess) {
      return;
    }

    const { messageId, senderId, groupId, text, image, fileUrl, fileName, fileSize, fileType, mimeType, createdAt, members, senderInfo } = data;

    const messageData = {
      _id: messageId,
      senderId: {
        _id: senderId,
        fullName: senderInfo.fullName,
        profilePic: senderInfo.profilePic,
      },
      groupId,
      text,
      image,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      createdAt,
    };

    // Get Socket.IO instance
    const io = await getSocketIO();
    if (!io) {
      console.warn('Socket.IO not available for group message delivery - likely running in worker process');
      return;
    }

    // Send to all group members
    members.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('newGroupMessage', messageData);
      }
    });

    // Also emit to group room
    io.to(`group_${groupId}`).emit('newGroupMessage', messageData);

    console.log(`Group message delivered to ${members.length} members: ${messageId}`);
  }

  async handleUserPresence(data) {
    const { userId, status, timestamp } = data;
    
    const io = await getSocketIO();
    if (!io) return;
    
    // Broadcast user presence to all connected clients
    io.emit('userPresenceUpdate', {
      userId,
      status,
      timestamp
    });
  }

  async handleTyping(data) {
    const { senderId, receiverId, groupId, isTyping } = data;
    
    const io = await getSocketIO();
    if (!io) return;

    if (groupId) {
      // Group typing
      io.to(`group_${groupId}`).emit('typing', {
        senderId,
        groupId,
        isTyping
      });
    } else if (receiverId) {
      // Direct message typing
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', {
          senderId,
          isTyping
        });
      }
    }
  }

  async handleMessageRead(data) {
    // Handle message read receipts
    console.log('Message read:', data);
  }

  async handleGroupNotification(data) {
    const { groupId, type, userId, userName, timestamp } = data;
    
    const io = await getSocketIO();
    if (!io) return;

    io.to(`group_${groupId}`).emit('groupNotification', {
      type,
      userId,
      userName,
      timestamp
    });
  }

  async handleNotification(data) {
    const { userId, type, message, timestamp } = data;
    
    const io = await getSocketIO();
    if (!io) return;

    const userSocketId = getReceiverSocketId(userId);
    if (userSocketId) {
      io.to(userSocketId).emit('notification', {
        type,
        message,
        timestamp
      });
    }
  }

  async handleUserPresenceUpdate(data) {
    const { userId, status } = data;
    
    const io = await getSocketIO();
    if (!io) return;

    io.emit('userPresenceUpdate', {
      userId,
      status,
      lastSeen: new Date()
    });
  }
}

// Create and export singleton instance
const pubSubManager = new PubSubManager();

console.log('Pub/Sub manager initialized for distributed messaging');

export default pubSubManager;