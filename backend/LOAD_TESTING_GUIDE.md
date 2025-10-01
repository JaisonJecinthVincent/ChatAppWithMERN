# 🚀 LOAD TESTING GUIDE - Test 2000-5000 Concurrent Users

## Quick Start Testing Steps:

### 1. **Verify Server is Running**
Make sure your clustered server is running on port 5000. You should see:
```
🎯 Master [PID] is running  
📊 CPU Cores: X, Workers: 4
✅ Worker 0/1/2/3 is ready
```

### 2. **Start with Small Test (500 users)**
```powershell
npm run test:stress:small
```
This will test 500 concurrent users for 2 minutes.

### 3. **Medium Test (1500 users)**
```powershell
npm run test:stress:medium
```
This will test 1500 concurrent users for 3 minutes.

### 4. **Large Test (2500 users)**
```powershell
npm run test:stress:large
```
This will test 2500 concurrent users for 5 minutes.

### 5. **XL Test (5000 users)**
```powershell
npm run test:stress:xlarge
```
This will test 5000 concurrent users for 5 minutes.

### 6. **HTTP Load Test**
```powershell
npm run test:load
```
Artillery test with various HTTP endpoints.

## What Each Test Does:

### Socket.IO Stress Tests
- **Gradual Connection**: Connects users in batches of 100
- **Sustained Load**: Users send messages at 0.5 msg/sec
- **Burst Testing**: 5 rapid messages from each user
- **Performance Monitoring**: Memory, CPU, connection success rates

### Expected Results:
- **Success Rate**: Should be >95% for reliable capacity
- **Connection Time**: Should be <2000ms average
- **Message Latency**: Should be <500ms average
- **Memory Usage**: Monitor for memory leaks

## How to Interpret Results:

### ✅ **PASS Criteria**:
- 95%+ connection success rate
- <2s average connection time
- <500ms message latency
- Stable memory usage

### ⚠️ **WARNING Criteria**:
- 90-95% connection success rate
- 2-5s connection time
- 500ms-1s message latency

### ❌ **FAIL Criteria**:
- <90% connection success rate
- >5s connection time
- >1s message latency
- Memory leaks/crashes

## Quick Manual Test:

If the automated tests don't work, you can quickly test by:

1. **Open multiple browser tabs** to http://localhost:5173
2. **Login with different accounts** in each tab
3. **Send messages rapidly** between tabs
4. **Monitor server console** for errors/performance

## Expected Capacity Based on Architecture:

- **Conservative Estimate**: 2000-3000 users ✅
- **Optimistic Estimate**: 4000-5000 users 🎯
- **Current Architecture**: 4 Node.js workers + Redis clustering

## Troubleshooting:

### If tests fail to start:
```powershell
# Check if server is running
curl http://localhost:5000/api/auth/check

# Check if socket.io is working  
# (Should see "Cannot GET /socket.io/" - this is normal)
curl http://localhost:5000/socket.io/
```

### If connection errors occur:
- Ensure MongoDB is connected
- Ensure Redis is available (if configured)
- Check Windows Firewall settings
- Monitor system resources (Task Manager)

### Manual testing commands:
```powershell
# Test HTTP endpoint
curl -X POST http://localhost:5000/api/auth/check

# Basic connectivity test
telnet localhost 5000
```

## Monitoring During Tests:

1. **Windows Task Manager**: Monitor CPU and Memory usage
2. **Server Console**: Watch for error messages
3. **Network**: Monitor network utilization
4. **Database**: MongoDB connection status

## Starting the Tests:

Run tests in this order for best results:

```powershell
# Start with smallest test
npm run test:stress:small

# If successful, try medium
npm run test:stress:medium

# If successful, try large  
npm run test:stress:large

# Ultimate test
npm run test:stress:xlarge
```

Each test will show detailed results including:
- Connection success rates
- Message throughput
- Performance metrics
- Capacity assessment

Ready to test? Start with: `npm run test:stress:small`