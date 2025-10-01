// Comprehensive load test to verify 2000-5000 concurrent user capacity
import { io as ClientIO } from 'socket.io-client';
import { performance } from 'perf_hooks';
import http from 'http';
import https from 'https';

class ComprehensiveLoadTester {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:5000';
    this.httpUrl = options.httpUrl || 'http://localhost:5000';
    this.targetUsers = options.targetUsers || 2000; // Start with 2000 users
    this.batchSize = options.batchSize || 100; // Connect 100 users at a time
    this.testDuration = options.testDuration || 300000; // 5 minutes
    this.messageRate = options.messageRate || 0.5; // Messages per second per user
    
    this.clients = [];
    this.httpClients = [];
    this.testUsers = [];
    
    this.stats = {
      socketConnections: {
        attempted: 0,
        successful: 0,
        failed: 0,
        connectionTimes: []
      },
      httpRequests: {
        attempted: 0,
        successful: 0,
        failed: 0,
        responseTimes: []
      },
      messages: {
        sent: 0,
        received: 0,
        failed: 0,
        latencies: []
      },
      performance: {
        startTime: null,
        endTime: null,
        peakMemory: 0,
        cpuUsage: []
      },
      errors: []
    };
  }

  async runFullCapacityTest() {
    console.log(`🚀 COMPREHENSIVE LOAD TEST - TESTING ${this.targetUsers} CONCURRENT USERS`);
    console.log(`📊 Target: ${this.url}`);
    console.log(`⏱️  Test Duration: ${this.testDuration / 1000} seconds`);
    console.log(`📈 Message Rate: ${this.messageRate} msg/sec per user`);
    console.log(`🔄 Batch Size: ${this.batchSize} users per batch`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    this.stats.performance.startTime = performance.now();
    
    try {
      // Phase 1: Gradual user connection
      console.log('🔍 Starting Phase 1: Gradual User Connection');
      await this.gradualUserConnection();
      
      // Phase 2: Sustained load testing
      console.log('🔍 Starting Phase 2: Sustained Load Testing');
      await this.sustainedLoadTest();
      
      // Phase 3: Stress testing with message burst
      console.log('🔍 Starting Phase 3: Stress Burst Testing');
      await this.stressBurstTest();
      
      // Phase 4: Graceful cleanup
      console.log('🔍 Starting Phase 4: Cleanup');
      await this.cleanup();
      
    } catch (error) {
      console.error(`❌ Test failed:`, error);
      console.error('Error stack:', error.stack);
      this.stats.errors.push(`Fatal error: ${error.message}`);
    }
    
    this.stats.performance.endTime = performance.now();
    this.generateDetailedReport();
  }

  async gradualUserConnection() {
    console.log(`\n📡 PHASE 1: Gradual User Connection`);
    const batches = Math.ceil(this.targetUsers / this.batchSize);
    let connectedUsers = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const currentBatchSize = Math.min(this.batchSize, this.targetUsers - connectedUsers);
      
      console.log(`🔄 Batch ${batch + 1}/${batches}: Connecting ${currentBatchSize} users...`);
      
      const batchPromises = [];
      for (let i = 0; i < currentBatchSize; i++) {
        const userId = `load_user_${batch}_${i}`;
        batchPromises.push(this.createRealisticUser(userId));
      }
      
      const results = await Promise.allSettled(batchPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      connectedUsers += successful;
      
      console.log(`✅ Batch ${batch + 1} complete: ${successful}/${currentBatchSize} connected (Total: ${connectedUsers}/${this.targetUsers})`);
      
      // Monitor memory after each batch
      const memUsage = process.memoryUsage();
      this.stats.performance.peakMemory = Math.max(this.stats.performance.peakMemory, memUsage.heapUsed);
      
      if (batch < batches - 1) {
        await this.sleep(2000); // 2 second delay between batches
      }
      
      // Check if we're hitting limits
      if (successful < currentBatchSize * 0.8) {
        console.warn(`⚠️  Connection success rate dropping: ${(successful/currentBatchSize*100).toFixed(1)}%`);
        if (successful < currentBatchSize * 0.5) {
          console.error(`🛑 Connection success rate too low, stopping at ${connectedUsers} users`);
          break;
        }
      }
    }
    
    console.log(`📊 Phase 1 Complete: ${this.stats.socketConnections.successful}/${this.stats.socketConnections.attempted} connections successful`);
  }

  async createRealisticUser(userId) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      this.stats.socketConnections.attempted++;
      
      const client = ClientIO(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 15000,
        query: { userId },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      const timeout = setTimeout(() => {
        this.stats.socketConnections.failed++;
        this.stats.errors.push(`Connection timeout for user ${userId}`);
        client.disconnect();
        reject(new Error(`Connection timeout for ${userId}`));
      }, 15000);

      client.on('connect', () => {
        clearTimeout(timeout);
        const connectionTime = performance.now() - startTime;
        this.stats.socketConnections.connectionTimes.push(connectionTime);
        this.stats.socketConnections.successful++;
        
        // Realistic user behavior
        client.emit('join_user_room', userId);
        
        // Set up message listeners
        client.on('newMessage', (message) => {
          this.stats.messages.received++;
          const latency = performance.now() - (message.timestamp || performance.now());
          if (latency > 0) {
            this.stats.messages.latencies.push(latency);
          }
        });

        client.on('disconnect', (reason) => {
          console.log(`👋 User ${userId} disconnected: ${reason}`);
        });

        client.on('connect_error', (error) => {
          this.stats.errors.push(`${userId} connection error: ${error.message}`);
        });
        
        this.clients.push({ client, userId, connected: true });
        this.testUsers.push(userId);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.stats.socketConnections.failed++;
        this.stats.errors.push(`${userId} failed to connect: ${error.message}`);
        reject(error);
      });
    });
  }

  async sustainedLoadTest() {
    console.log(`\n📈 PHASE 2: Sustained Load Testing (${this.testDuration / 1000}s)`);
    console.log(`👥 Active Users: ${this.clients.length}`);
    console.log(`💬 Expected Messages/sec: ${(this.clients.length * this.messageRate).toFixed(1)}`);
    
    const endTime = Date.now() + this.testDuration;
    const messageIntervals = [];
    
    // Start message sending for each user
    this.clients.forEach(({ client, userId }) => {
      if (client && client.connected) {
        const interval = setInterval(() => {
          try {
            const message = {
              text: `Test message from ${userId} at ${Date.now()}`,
              timestamp: performance.now(),
              userId: userId
            };
            
            // Randomly send to user or group
            if (Math.random() > 0.7 && this.testUsers.length > 1) {
              // Send to random user (30% chance)
              const targetUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)];
              if (targetUser !== userId) {
                client.emit('sendMessage', {
                  receiverId: targetUser,
                  text: message.text
                });
              }
            } else {
              // Broadcast message (70% chance)
              client.emit('broadcastMessage', message);
            }
            
            this.stats.messages.sent++;
          } catch (error) {
            this.stats.messages.failed++;
            this.stats.errors.push(`Message send error for ${userId}: ${error.message}`);
          }
        }, 1000 / this.messageRate); // Convert to milliseconds
        
        messageIntervals.push(interval);
      }
    });

    // Monitor performance during sustained load
    const monitorInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.stats.performance.peakMemory = Math.max(this.stats.performance.peakMemory, memUsage.heapUsed);
      
      console.log(`📊 Active: ${this.clients.filter(c => c.client && c.client.connected).length}/${this.clients.length} | ` +
                 `Messages: ${this.stats.messages.sent} sent, ${this.stats.messages.received} received | ` +
                 `Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    }, 10000); // Every 10 seconds

    // Wait for test duration
    while (Date.now() < endTime) {
      await this.sleep(5000);
      
      // Check connection health
      const activeConnections = this.clients.filter(c => c.client && c.client.connected).length;
      if (activeConnections < this.clients.length * 0.8) {
        console.warn(`⚠️  Connection drop detected: ${activeConnections}/${this.clients.length} active`);
      }
    }
    
    // Clean up intervals
    messageIntervals.forEach(interval => clearInterval(interval));
    clearInterval(monitorInterval);
    
    console.log(`✅ Phase 2 Complete: Sustained ${this.testDuration / 1000}s load test`);
  }

  async stressBurstTest() {
    console.log(`\n⚡ PHASE 3: Stress Burst Testing`);
    
    const activeClients = this.clients.filter(c => c.client && c.client.connected);
    console.log(`🔥 Sending message burst from ${activeClients.length} users...`);
    
    const burstPromises = activeClients.map(({ client, userId }) => {
      return new Promise((resolve) => {
        try {
          // Send 5 messages rapidly
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              if (client && client.connected) {
                client.emit('broadcastMessage', {
                  text: `Burst message ${i + 1} from ${userId}`,
                  timestamp: performance.now(),
                  userId: userId
                });
                this.stats.messages.sent++;
              }
            }, i * 100); // 100ms apart
          }
          resolve();
        } catch (error) {
          this.stats.errors.push(`Burst test error for ${userId}: ${error.message}`);
          resolve();
        }
      });
    });
    
    await Promise.allSettled(burstPromises);
    
    // Wait for messages to be processed
    await this.sleep(5000);
    
    console.log(`⚡ Burst test complete: ${activeClients.length * 5} messages sent`);
  }

  async cleanup() {
    console.log(`\n🧹 PHASE 4: Cleanup`);
    
    const disconnectPromises = this.clients.map(({ client, userId }) => {
      return new Promise((resolve) => {
        if (client && client.connected) {
          client.disconnect();
          setTimeout(resolve, 100); // Small delay for graceful disconnect
        } else {
          resolve();
        }
      });
    });
    
    await Promise.allSettled(disconnectPromises);
    console.log(`👋 Disconnected ${this.clients.length} users`);
  }

  generateDetailedReport() {
    const totalTime = (this.stats.performance.endTime - this.stats.performance.startTime) / 1000;
    
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`📊 COMPREHENSIVE LOAD TEST RESULTS`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    // Connection Statistics
    console.log(`\n🔌 CONNECTION STATISTICS:`);
    console.log(`   Target Users: ${this.targetUsers}`);
    console.log(`   Connection Attempts: ${this.stats.socketConnections.attempted}`);
    console.log(`   Successful Connections: ${this.stats.socketConnections.successful}`);
    console.log(`   Failed Connections: ${this.stats.socketConnections.failed}`);
    console.log(`   Success Rate: ${((this.stats.socketConnections.successful / this.stats.socketConnections.attempted) * 100).toFixed(2)}%`);
    
    if (this.stats.socketConnections.connectionTimes.length > 0) {
      const avgConnTime = this.stats.socketConnections.connectionTimes.reduce((a, b) => a + b, 0) / this.stats.socketConnections.connectionTimes.length;
      const maxConnTime = Math.max(...this.stats.socketConnections.connectionTimes);
      console.log(`   Avg Connection Time: ${avgConnTime.toFixed(2)}ms`);
      console.log(`   Max Connection Time: ${maxConnTime.toFixed(2)}ms`);
    }
    
    // Message Statistics
    console.log(`\n💬 MESSAGE STATISTICS:`);
    console.log(`   Messages Sent: ${this.stats.messages.sent}`);
    console.log(`   Messages Received: ${this.stats.messages.received}`);
    console.log(`   Messages Failed: ${this.stats.messages.failed}`);
    console.log(`   Message Rate: ${(this.stats.messages.sent / totalTime).toFixed(2)} msg/sec`);
    
    if (this.stats.messages.latencies.length > 0) {
      const avgLatency = this.stats.messages.latencies.reduce((a, b) => a + b, 0) / this.stats.messages.latencies.length;
      const maxLatency = Math.max(...this.stats.messages.latencies);
      console.log(`   Avg Message Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`   Max Message Latency: ${maxLatency.toFixed(2)}ms`);
    }
    
    // Performance Statistics
    console.log(`\n⚡ PERFORMANCE STATISTICS:`);
    console.log(`   Total Test Duration: ${totalTime.toFixed(2)} seconds`);
    console.log(`   Peak Memory Usage: ${(this.stats.performance.peakMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Concurrent Users Achieved: ${this.stats.socketConnections.successful}`);
    
    // Error Analysis
    console.log(`\n❌ ERROR ANALYSIS:`);
    console.log(`   Total Errors: ${this.stats.errors.length}`);
    if (this.stats.errors.length > 0) {
      const errorTypes = {};
      this.stats.errors.forEach(error => {
        const type = error.split(':')[0];
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
    
    // Capacity Assessment
    console.log(`\n🎯 CAPACITY ASSESSMENT:`);
    const successRate = (this.stats.socketConnections.successful / this.stats.socketConnections.attempted) * 100;
    const effectiveUsers = this.stats.socketConnections.successful;
    
    if (successRate >= 95 && effectiveUsers >= this.targetUsers * 0.95) {
      console.log(`   ✅ PASS: Application successfully supports ${effectiveUsers} concurrent users`);
    } else if (successRate >= 90 && effectiveUsers >= this.targetUsers * 0.8) {
      console.log(`   ⚠️  MARGINAL: Application supports ${effectiveUsers} users with ${successRate.toFixed(1)}% success rate`);
    } else {
      console.log(`   ❌ FAIL: Application cannot reliably support ${this.targetUsers} concurrent users`);
      console.log(`   Maximum supported: ~${effectiveUsers} users`);
    }
    
    console.log(`\n📈 SCALING RECOMMENDATIONS:`);
    if (effectiveUsers >= 2000) {
      console.log(`   🚀 Excellent: Ready for production with 2000+ users`);
    } else if (effectiveUsers >= 1000) {
      console.log(`   👍 Good: Suitable for medium-scale deployment (1000+ users)`);
    } else {
      console.log(`   🔧 Needs optimization: Consider infrastructure improvements`);
    }
    
    console.log(`═══════════════════════════════════════════════════════════\n`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Test configurations for different scales
const testConfigs = {
  small: { targetUsers: 500, testDuration: 120000 },
  medium: { targetUsers: 1500, testDuration: 180000 },
  large: { targetUsers: 2500, testDuration: 300000 },
  xlarge: { targetUsers: 5000, testDuration: 300000 }
};

// Main execution
async function runCapacityTests() {
  console.log('🚀 Starting capacity test script...');
  console.log('Arguments:', process.argv);
  
  const testSize = process.argv[2] || 'medium';
  console.log('Test size:', testSize);
  
  const config = testConfigs[testSize];
  console.log('Test config:', config);
  
  if (!config) {
    console.error('Usage: node stress-test.js [small|medium|large|xlarge]');
    console.error('Available configs:', Object.keys(testConfigs));
    process.exit(1);
  }
  
  console.log(`🎯 Running ${testSize.toUpperCase()} scale test...`);
  
  const tester = new ComprehensiveLoadTester(config);
  console.log('Tester created, starting test...');
  await tester.runFullCapacityTest();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || 
    import.meta.url.endsWith('stress-test.js')) {
  console.log('🚀 Script executed directly, starting tests...');
  runCapacityTests().catch(console.error);
} else {
  console.log('Script imported as module');
}

export default ComprehensiveLoadTester;