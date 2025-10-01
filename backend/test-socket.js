// Simple Socket.IO test
import { io as ClientIO } from 'socket.io-client';

console.log('🔍 Testing Socket.IO connection...');

const socket = ClientIO('http://localhost:5000', {
  timeout: 5000,
  transports: ['polling', 'websocket'],
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connected successfully!');
  console.log('Socket ID:', socket.id);
  
  // Test with userId
  console.log('🔄 Testing with userId...');
  socket.disconnect();
  
  const socketWithUser = ClientIO('http://localhost:5000', {
    query: { userId: 'test_user_123' },
    timeout: 5000,
    transports: ['polling', 'websocket'],
    forceNew: true
  });
  
  socketWithUser.on('connect', () => {
    console.log('✅ Socket.IO with userId connected successfully!');
    console.log('Socket ID:', socketWithUser.id);
    socketWithUser.disconnect();
    process.exit(0);
  });
  
  socketWithUser.on('connect_error', (error) => {
    console.log('❌ Socket.IO with userId connection error:', error.message);
    process.exit(1);
  });
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket.IO connection error:', error.message);
  console.log('Error details:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏰ Connection timeout');
  socket.disconnect();
  process.exit(1);
}, 10000);