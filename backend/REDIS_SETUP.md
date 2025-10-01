# Redis Setup Guide for Chat Application

## Quick Start (Recommended)

### Option 1: Using Docker (Easiest)
```bash
# Start Redis in Docker
docker run -d -p 6379:6379 --name redis redis:alpine

# Check if running
docker ps

# Stop Redis
docker stop redis

# Remove Redis container
docker rm redis
```

### Option 2: Install Redis on Windows

#### Using Chocolatey:
```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis
choco install redis-64

# Start Redis
redis-server
```

#### Manual Installation:
1. Download Redis for Windows: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\Redis`
3. Add `C:\Redis` to your PATH
4. Open PowerShell and run: `redis-server`

### Option 3: Redis Cloud (Production)
- Use Redis Cloud: https://redis.com/redis-enterprise-cloud/
- Get connection details and update your `.env` file

## Environment Variables

Create a `.env` file in the backend directory with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/chat-app

# Redis (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-password-if-needed

# Redis Cloud (if using cloud)
# REDIS_HOST=your-redis-cloud-endpoint
# REDIS_PORT=your-redis-cloud-port
# REDIS_PASSWORD=your-redis-cloud-password

# JWT
JWT_SECRET=your-jwt-secret-key

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Server
PORT=5001
NODE_ENV=development
SESSION_SECRET=your-session-secret
```

## Development vs Production

### Development Mode (Current)
- Application runs without Redis
- Uses mock queues and direct Socket.IO
- Single server instance
- No message persistence in queues

### Production Mode (With Redis)
- Distributed message queues
- Pub/Sub for multi-server scaling
- Message persistence and retry logic
- Can handle thousands of concurrent users

## Testing Redis Connection

```bash
# Test if Redis is running
redis-cli ping
# Should return: PONG

# Or using Node.js
node -e "const Redis = require('ioredis'); const redis = new Redis(); redis.ping().then(console.log).catch(console.error);"
```

## Benefits of Redis for Chat App

1. **Horizontal Scaling**: Multiple server instances
2. **Message Queues**: Reliable message processing
3. **Pub/Sub**: Real-time message distribution
4. **Caching**: Faster data access
5. **Session Storage**: Shared user sessions
6. **Rate Limiting**: Prevent spam/abuse

## Without Redis

The application will still work but with limitations:
- Single server instance only
- No message queuing (direct processing)
- No distributed pub/sub
- No caching benefits
- Limited scalability