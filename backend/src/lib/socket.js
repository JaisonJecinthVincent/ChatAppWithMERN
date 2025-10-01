import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import redisManager from "./redis.js";
import cluster from "cluster";

// Worker identification
const workerId = process.env.WORKER_ID || 'main';
const workerPid = process.env.WORKER_PID || process.pid;

console.log(`🔌 Socket.IO Module Loading on Worker ${workerId} (PID: ${workerPid})`);

// Global variables
let io = null;
let redisAdapterEnabled = false;

// User socket mapping
const userSocketMap = new Map();
const groupSocketMap = new Map(); // Map to track users in groups

// Helper functions
export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId);
}

export function getOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

// Get socket IDs for all members of a group
export function getGroupSocketIds(groupId) {
  const groupMembers = groupSocketMap.get(groupId) || new Set();
  const socketIds = [];
  
  for (const userId of groupMembers) {
    const socketId = userSocketMap.get(userId);
    if (socketId) {
      socketIds.push(socketId);
    }
  }
  
  return socketIds;
}

// Add user to group tracking
export function addUserToGroup(userId, groupId) {
  if (!groupSocketMap.has(groupId)) {
    groupSocketMap.set(groupId, new Set());
  }
  groupSocketMap.get(groupId).add(userId);
}

// Remove user from group tracking
export function removeUserFromGroup(userId, groupId) {
  const groupMembers = groupSocketMap.get(groupId);
  if (groupMembers) {
    groupMembers.delete(userId);
    if (groupMembers.size === 0) {
      groupSocketMap.delete(groupId);
    }
  }
}

// Initialize Redis adapter for clustering with performance optimization
async function initializeSocketAdapter(ioInstance) {
  try {
    const pubClient = redisManager.getRawRedis();
    const subClient = pubClient.duplicate();
    
    await pubClient.ping();
    
    // Enhanced Redis adapter configuration for high concurrency
    ioInstance.adapter(createAdapter(pubClient, subClient, {
      key: 'socket.io',
      requestsTimeout: 5000,        // Increased from 3000ms - more tolerance for Redis under load
      publishOnSpecificResponseChannel: true, // Optimize Redis pub/sub
      // Note: Removed custom parser to fix compatibility issues with newer versions
      // Redis adapter performance settings
      maxDisconnectedTime: 10000,   // Increased from 5000ms - allow more time before cleanup
      cleanupInterval: 45000,       // Increased from 30000ms - reduce cleanup frequency
    }));
    
    redisAdapterEnabled = true;
    console.log(`✅ Worker ${workerId}: Redis adapter configured with performance optimizations`);
    
  } catch (error) {
    console.log(`⚠️  Worker ${workerId}: Redis not available, single-server mode`);
    redisAdapterEnabled = false;
  }
}

// Connection statistics for load balancing
const connectionStats = {
  connectionsPerWorker: new Map(),
  totalConnections: 0,
  averageConnectionTime: 0,
  connectionHistory: []
};

// Setup all socket event handlers with performance optimizations
function setupSocketHandlers(ioInstance) {
  ioInstance.on('connection', (socket) => {
    const connectionStartTime = Date.now();
    const userId = socket.handshake.query.userId;
    
    console.log(`👤 Worker ${workerId}: User ${userId || 'anonymous'} connected ${socket.id}`);
    
    // Update connection statistics
    connectionStats.totalConnections++;
    connectionStats.connectionsPerWorker.set(workerId, 
      (connectionStats.connectionsPerWorker.get(workerId) || 0) + 1);

    // Enhanced user mapping with validation
    if (userId && userId !== "undefined" && userId !== "null") {
      userSocketMap.set(userId, socket.id);
      
      // Update user online status in database (async without await)
      User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      }).then(() => {
        console.log(`✅ Worker ${workerId}: User ${userId} marked as online`);
      }).catch(error => {
        console.error(`❌ Failed to update online status for user ${userId}:`, error.message);
      });
      
      // Emit immediately to avoid Redis adapter issues
      ioInstance.emit("getOnlineUsers", getOnlineUsers());
    }

    // Performance-optimized event handlers
    socket.on('join_user_room', (userId) => {
      if (userId && userId !== "undefined") {
        socket.join(`user_${userId}`, (err) => {
          if (err) console.error(`Failed to join user room: ${err.message}`);
        });
      }
    });

    socket.on('join_group', async (groupId) => {
      try {
        if (groupId && groupId !== "undefined") {
          await socket.join(`group_${groupId}`);
          if (userId) {
            addUserToGroup(userId, groupId);
          }
          console.log(`📡 User ${userId} joined group ${groupId}`);
        }
      } catch (error) {
        console.error(`Failed to join group ${groupId}:`, error.message);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    socket.on('leave_group', (groupId) => {
      if (groupId && groupId !== "undefined") {
        socket.leave(`group_${groupId}`);
        if (userId) {
          removeUserFromGroup(userId, groupId);
          console.log(`📡 User ${userId} left group ${groupId}`);
        }
      }
    });

    // Optimized typing indicator with rate limiting
    let typingTimeout = null;
    socket.on('typing', (data) => {
      if (typingTimeout) return; // Rate limit typing events
      
      const { receiverId, isTyping } = data;
      const receiverSocketId = getReceiverSocketId(receiverId);
      
      if (receiverSocketId) {
        ioInstance.to(receiverSocketId).emit('typing', { senderId: userId, isTyping });
      }
      
      // Rate limit: prevent spam
      typingTimeout = setTimeout(() => { typingTimeout = null; }, 500);
    });

    socket.on('group_typing', (data) => {
      const { groupId, isTyping } = data;
      if (groupId && groupId !== "undefined") {
        socket.to(`group_${groupId}`).emit('group_typing', {
          userId: userId,
          groupId,
          isTyping
        });
      }
    });

    // Message reactions handler
    socket.on('message_reaction', (data) => {
      const { messageId, reaction, isAdd } = data;
      
      if (!messageId || !reaction) {
        console.log(`⚠️ Worker ${workerId}: Invalid reaction data from ${userId}`);
        return;
      }

      console.log(`👍 Worker ${workerId}: ${isAdd ? 'Adding' : 'Removing'} reaction ${reaction} to message ${messageId} by ${userId}`);
      
      // Emit to all connected clients except sender
      socket.broadcast.emit('message_reaction_update', {
        messageId,
        reaction,
        userId,
        isAdd,
        timestamp: new Date()
      });
    });

    // Enhanced disconnect handler with cleanup and analytics
    socket.on('disconnect', (reason) => {
      const connectionDuration = Date.now() - connectionStartTime;
      console.log(`👋 Worker ${workerId}: User ${userId || 'anonymous'} disconnected ${socket.id} (${reason}) after ${connectionDuration}ms`);
      
      // Update connection statistics
      connectionStats.totalConnections--;
      const workerConnections = connectionStats.connectionsPerWorker.get(workerId) || 0;
      if (workerConnections > 0) {
        connectionStats.connectionsPerWorker.set(workerId, workerConnections - 1);
      }
      
      // Update average connection time
      connectionStats.connectionHistory.push(connectionDuration);
      if (connectionStats.connectionHistory.length > 100) {
        connectionStats.connectionHistory.shift(); // Keep last 100 connections
      }
      connectionStats.averageConnectionTime = 
        connectionStats.connectionHistory.reduce((a, b) => a + b, 0) / connectionStats.connectionHistory.length;
      
      if (userId && userId !== "undefined") {
        userSocketMap.delete(userId);
        
        // Update user offline status in database (async without await)
        User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        }).then(() => {
          console.log(`✅ Worker ${workerId}: User ${userId} marked as offline`);
        }).catch(error => {
          console.error(`❌ Failed to update offline status for user ${userId}:`, error.message);
        });
        
        // Emit immediately to avoid Redis adapter issues
        ioInstance.emit("getOnlineUsers", getOnlineUsers());
      }
    });

    socket.on('error', (error) => {
      console.error(`❌ Worker ${workerId}: Socket error:`, error);
    });
  });
}

// Main initialization function
export async function initializeSocket(httpServer) {
  try {
    console.log(`🚀 Worker ${workerId}: Initializing Socket.IO...`);
    
    io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      // Balanced timeouts for high concurrency (Phase 2.1 - Revised)
      pingTimeout: 45000,        // Increased from 30s - more tolerance for high load
      pingInterval: 15000,       // Increased from 10s - reduce ping frequency under load
      connectTimeout: 30000,     // Increased from 20s - allow more time for connections
      upgradeTimeout: 15000,     // Increased from 10s - allow more time for upgrades
      // Connection limits and performance optimizations
      maxHttpBufferSize: 10e6,   // 10MB limit for HTTP requests
      allowEIO3: true,           // Support older Engine.IO clients
      // Connection throttling for high load scenarios
      allowRequest: (req, callback) => {
        // Simple rate limiting based on current connections
        const currentConnections = io ? io.sockets.sockets.size : 0;
        const maxConnections = 2000; // Allow up to 2000 concurrent connections
        
        if (currentConnections >= maxConnections) {
          console.warn(`🚦 Connection limit reached: ${currentConnections}/${maxConnections}`);
          callback('Server at capacity', false);
        } else {
          callback(null, true);
        }
      },
      // Enhanced performance settings
      perMessageDeflate: {
        threshold: 1024,         // Only compress messages > 1KB
        concurrencyLimit: 10,    // Limit concurrent compression operations
        memLevel: 8              // Memory level for compression
      },
      httpCompression: {
        threshold: 1024,         // Only compress responses > 1KB
        level: 6,                // Compression level (0-9)
        chunkSize: 1024          // Chunk size for streaming compression
      },
      // Disable connection state recovery for now to avoid session issues
      // connectionStateRecovery: {
      //   maxDisconnectionDuration: 2 * 60 * 1000,
      //   skipMiddlewares: true,
      // },
      serveClient: false
    });

    await initializeSocketAdapter(io);
    await setupSocketHandlers(io);
    
    console.log(`✅ Worker ${workerId}: Socket.IO initialized successfully`);
    return io;
    
  } catch (error) {
    console.error(`❌ Worker ${workerId}: Socket.IO initialization failed:`, error);
    throw error;
  }
}

// Enhanced health monitoring with load balancing metrics
export function getSocketStats() {
  if (!io) {
    return {
      status: 'not_initialized',
      connections: 0,
      rooms: 0,
      redisAdapter: false
    };
  }

  return {
    status: 'healthy',
    workerId,
    connections: io.sockets.sockets.size,
    onlineUsers: userSocketMap.size,
    rooms: io.sockets.adapter.rooms.size,
    redisAdapter: redisAdapterEnabled,
    // Performance metrics
    stats: {
      totalConnections: connectionStats.totalConnections,
      connectionsPerWorker: Object.fromEntries(connectionStats.connectionsPerWorker),
      averageConnectionTime: Math.round(connectionStats.averageConnectionTime || 0),
      connectionHistory: connectionStats.connectionHistory.length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
}

// Get worker load for load balancing decisions
export function getWorkerLoad() {
  return {
    workerId,
    connections: io ? io.sockets.sockets.size : 0,
    memoryUsage: process.memoryUsage().rss,
    cpuUsage: process.cpuUsage(),
    averageConnectionTime: connectionStats.averageConnectionTime || 0
  };
}

// Graceful shutdown
export async function closeSocket() {
  if (io) {
    console.log(`🛑 Worker ${workerId}: Closing Socket.IO...`);
    io.close();
    console.log(`✅ Worker ${workerId}: Socket.IO closed`);
  }
}

// Export the io instance
export { io };

console.log(`✅ Worker ${workerId}: Socket.IO module loaded`);
