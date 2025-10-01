// Simple connectivity test
import { io as ClientIO } from 'socket.io-client';
import http from 'http';

console.log('🔍 Testing basic connectivity to chat application...\n');

// Test 1: HTTP endpoint
console.log('1. Testing HTTP server...');
const req = http.get('http://localhost:5000/api/health', (res) => {
  console.log(`✅ HTTP server responding: ${res.statusCode}`);
  
  // Test 2: Socket.IO connection
  console.log('\n2. Testing Socket.IO connection...');
  const socket = ClientIO('http://localhost:5000', {
    timeout: 10000,
    transports: ['websocket', 'polling']
  });

  let connected = false;
  
  socket.on('connect', () => {
    connected = true;
    console.log('✅ Socket.IO connection successful!');
    console.log(`Socket ID: ${socket.id}`);
    
    // Test 3: Basic message sending
    console.log('\n3. Testing message sending...');
    socket.emit('join_user_room', 'test_user_123');
    
    setTimeout(() => {
      console.log('✅ Basic functionality test completed!');
      console.log('\n🎯 Server is ready for load testing!');
      console.log('\nTo test capacity, run:');
      console.log('  npm run test:stress:small   (500 users)');
      console.log('  npm run test:stress:medium  (1500 users)');
      console.log('  npm run test:stress:large   (2500 users)');
      
      socket.disconnect();
      process.exit(0);
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ Socket.IO connection failed: ${error.message}`);
    process.exit(1);
  });

  setTimeout(() => {
    if (!connected) {
      console.log('❌ Socket.IO connection timeout');
      process.exit(1);
    }
  }, 10000);
});

req.on('error', (error) => {
  console.log(`❌ HTTP server not accessible: ${error.message}`);
  console.log('Make sure your server is running on port 5000');
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.log('❌ HTTP server timeout');
  req.destroy();
  process.exit(1);
});