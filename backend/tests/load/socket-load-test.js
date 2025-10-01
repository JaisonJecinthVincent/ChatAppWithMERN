import { io as ClientIO } from 'socket.io-client';
import { performance } from 'perf_hooks';

class SocketLoadTester {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:5001';
    this.totalUsers = options.totalUsers || 500;
    this.concurrentUsers = options.concurrentUsers || 50;
    this.testDuration = options.testDuration || 120000; // 2 minutes
    this.messageInterval = options.messageInterval || 2000; // 2 seconds
    
    this.clients = [];
    this.stats = {
      connected: 0,
      disconnected: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      connectionTimes: [],
      messageTimes: [],
      startTime: null,
      endTime: null
    };
  }

  async runLoadTest() {
    console.log(`🚀 Starting Socket.IO Load Test`);
    console.log(`📊 Target: ${this.url}`);
    console.log(`👥 Total Users: ${this.totalUsers}`);
    console.log(`⚡ Concurrent Users: ${this.concurrentUsers}`);
    console.log(`⏱️  Test Duration: ${this.testDuration}ms`);
    
    this.stats.startTime = performance.now();

    // Create clients in batches
    const batches = Math.ceil(this.totalUsers / this.concurrentUsers);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(this.concurrentUsers, this.totalUsers - (batch * this.concurrentUsers));
      
      console.log(`🔄 Creating batch ${batch + 1}/${batches} with ${batchSize} clients...`);
      
      const batchPromises = [];
      for (let i = 0; i < batchSize; i++) {
        const userId = `user_${batch}_${i}`;
        batchPromises.push(this.createClient(userId));
      }
      
      await Promise.allSettled(batchPromises);
      
      // Wait between batches to avoid overwhelming the server
      if (batch < batches - 1) {
        await this.sleep(1000);
      }
    }

    console.log(`✅ Created ${this.clients.length} clients`);
    console.log(`📈 Connected: ${this.stats.connected}, Errors: ${this.stats.errors}`);

    // Run message simulation
    await this.simulateMessages();

    // Wait for test duration
    console.log(`⏳ Running test for ${this.testDuration}ms...`);
    await this.sleep(this.testDuration);

    // Clean up
    await this.cleanup();

    // Generate report
    this.generateReport();
  }

  async createClient(userId) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const client = ClientIO(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        query: { userId }
      });

      const timeout = setTimeout(() => {
        this.stats.errors++;
        resolve(null);
      }, 10000);

      client.on('connect', () => {
        clearTimeout(timeout);
        const connectionTime = performance.now() - startTime;
        this.stats.connectionTimes.push(connectionTime);
        this.stats.connected++;
        
        // Join user room
        client.emit('join_user_room', userId);
        
        this.clients.push({ client, userId });
        resolve(client);
      });

      client.on('disconnect', () => {
        this.stats.disconnected++;
      });

      client.on('newMessage', () => {
        this.stats.messagesReceived++;
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.stats.errors++;
        console.error(`Connection error for ${userId}:`, error.message);
        resolve(null);
      });

      client.on('error', (error) => {
        this.stats.errors++;
        console.error(`Socket error for ${userId}:`, error.message);
      });
    });
  }

  async simulateMessages() {
    console.log(`💬 Starting message simulation...`);
    
    // Start message sending for random clients
    const activeClients = this.clients.filter(c => c.client.connected);
    const messageCount = Math.min(50, activeClients.length); // Max 50 message senders
    
    for (let i = 0; i < messageCount; i++) {
      const clientData = activeClients[i];
      this.startMessageSending(clientData);
    }
  }

  startMessageSending(clientData) {
    const { client, userId } = clientData;
    
    const sendMessage = () => {
      if (!client.connected) return;
      
      const startTime = performance.now();
      const messageId = `msg_${Date.now()}_${Math.random()}`;
      
      // Simulate typing
      client.emit('typing', { receiverId: 'broadcast', isTyping: true });
      
      setTimeout(() => {
        // Stop typing and send message
        client.emit('typing', { receiverId: 'broadcast', isTyping: false });
        
        // Simulate sending a message (we'll track this as sent)
        this.stats.messagesSent++;
        const messageTime = performance.now() - startTime;
        this.stats.messageTimes.push(messageTime);
        
      }, Math.random() * 1000); // Random typing duration
    };

    // Send messages at intervals
    const interval = setInterval(sendMessage, this.messageInterval + (Math.random() * 1000));
    
    // Store interval for cleanup
    clientData.messageInterval = interval;
  }

  async cleanup() {
    console.log(`🧹 Cleaning up ${this.clients.length} clients...`);
    
    for (const clientData of this.clients) {
      if (clientData.messageInterval) {
        clearInterval(clientData.messageInterval);
      }
      
      if (clientData.client.connected) {
        clientData.client.disconnect();
      }
    }

    // Wait for disconnections
    await this.sleep(2000);
    
    this.stats.endTime = performance.now();
  }

  generateReport() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const avgConnectionTime = this.stats.connectionTimes.length > 0 
      ? this.stats.connectionTimes.reduce((a, b) => a + b, 0) / this.stats.connectionTimes.length 
      : 0;
    
    const avgMessageTime = this.stats.messageTimes.length > 0 
      ? this.stats.messageTimes.reduce((a, b) => a + b, 0) / this.stats.messageTimes.length 
      : 0;

    console.log(`\n📊 Load Test Report`);
    console.log(`==================`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Target Users: ${this.totalUsers}`);
    console.log(`Connected: ${this.stats.connected} (${((this.stats.connected / this.totalUsers) * 100).toFixed(1)}%)`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Disconnected: ${this.stats.disconnected}`);
    console.log(`Messages Sent: ${this.stats.messagesSent}`);
    console.log(`Messages Received: ${this.stats.messagesReceived}`);
    console.log(`Avg Connection Time: ${avgConnectionTime.toFixed(2)}ms`);
    console.log(`Avg Message Time: ${avgMessageTime.toFixed(2)}ms`);
    console.log(`Connection Success Rate: ${((this.stats.connected / (this.stats.connected + this.stats.errors)) * 100).toFixed(1)}%`);
    
    if (this.stats.connectionTimes.length > 0) {
      const sortedTimes = this.stats.connectionTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      
      console.log(`Connection Time P95: ${sortedTimes[p95Index]?.toFixed(2)}ms`);
      console.log(`Connection Time P99: ${sortedTimes[p99Index]?.toFixed(2)}ms`);
    }
    
    console.log(`\n🎯 Performance Assessment:`);
    const successRate = (this.stats.connected / (this.stats.connected + this.stats.errors)) * 100;
    
    if (successRate >= 95 && avgConnectionTime < 1000) {
      console.log(`✅ EXCELLENT: Success rate ${successRate.toFixed(1)}%, avg connection time ${avgConnectionTime.toFixed(0)}ms`);
    } else if (successRate >= 90 && avgConnectionTime < 2000) {
      console.log(`✔️  GOOD: Success rate ${successRate.toFixed(1)}%, avg connection time ${avgConnectionTime.toFixed(0)}ms`);
    } else if (successRate >= 80) {
      console.log(`⚠️  FAIR: Success rate ${successRate.toFixed(1)}%, avg connection time ${avgConnectionTime.toFixed(0)}ms`);
    } else {
      console.log(`❌ POOR: Success rate ${successRate.toFixed(1)}%, avg connection time ${avgConnectionTime.toFixed(0)}ms`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test if called directly
if (process.argv[1].endsWith('socket-load-test.js')) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (['totalUsers', 'concurrentUsers', 'testDuration', 'messageInterval'].includes(key)) {
        options[key] = parseInt(value);
      } else if (key === 'url') {
        options[key] = value;
      }
    }
  }

  const tester = new SocketLoadTester(options);
  tester.runLoadTest().catch(console.error);
}

export default SocketLoadTester;