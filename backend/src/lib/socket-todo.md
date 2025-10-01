# Socket.js File Requirements

## Core Structure:
1. Import necessary modules (Socket.IO, Redis adapter, models)
2. Worker identification variables (workerId, workerPid)
3. Global variables (io instance, redisAdapterEnabled flag)
4. User socket mapping (Map for tracking user-socket connections)

## Functions to implement:
1. `initializeSocketAdapter(ioInstance)` - Sets up Redis adapter for clustering
2. `setupSocketHandlers(ioInstance)` - Configures all socket event listeners
3. `initializeSocket(httpServer)` - Main initialization function (EXPORTED)
4. `getReceiverSocketId(userId)` - Helper to get socket ID for user (EXPORTED)
5. `getOnlineUsers()` - Returns array of online user IDs (EXPORTED)
6. `getSocketStats()` - Health monitoring function (EXPORTED)
7. `closeSocket()` - Graceful shutdown function (EXPORTED)

## Socket Event Handlers to include:
- connection (main handler)
- join_user_room
- join_group
- leave_group
- typing (direct messages)
- group_typing
- disconnect
- error

## Key Features:
- Redis clustering support with fallback to single-server mode
- Worker process identification in logs
- Online user tracking
- Room management for groups and users
- Typing indicators
- Error handling
- Graceful shutdown

## Exports:
- initializeSocket (main function)
- getReceiverSocketId
- getOnlineUsers  
- getSocketStats
- closeSocket
- io (the Socket.IO instance)

## Configuration:
- CORS settings for localhost:5173, 5174
- WebSocket and polling transports
- Connection timeouts and recovery
- Clustering optimizations