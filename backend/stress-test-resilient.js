import { io as ioClient } from 'socket.io-client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resilient Stress Test for Chat Application
 * Tests with realistic connection patterns and graceful degradation
 */

const SERVER_URL = 'http://localhost:5000';

// Test configuration - More realistic and gradual
const TEST_CONFIG = {
  // Phase 1: Gradual connection buildup
  phase1: {
    maxUsers: 1000,           // Reduced from 1500 to be more realistic
    batchSize: 50,            // Smaller batches for gradual buildup
    batchDelay: 2000,         // 2 second delay between batches
  },
  // Phase 2: Sustained load
  phase2: {
    duration: 120000,         // 2 minutes of sustained load
    messageInterval: 5000,    // Send message every 5 seconds (more realistic)
    disconnectionRate: 0.02,  // 2% natural disconnection rate
  },
  // Phase 3: Stress burst (gradual)
  phase3: {
    additionalUsers: 500,     // Add 500 more users for stress test
    batchSize: 25,            // Very small batches for stress phase
    batchDelay: 3000,         // 3 second delay for stress connections
  },
  // Phase 4: Graceful cleanup
  phase4: {
    disconnectBatchSize: 100,
    disconnectDelay: 1000,
  }
};

class ResilientStressTest {
  constructor() {
    this.clients = [];
    this.stats = {
      connected: 0,
      disconnected: 0,
      messages: 0,
      errors: 0,
      startTime: Date.now(),
      connectionTimes: [],
      messageLatencies: [],
      phases: {
        phase1: { status: 'pending', duration: 0 },
        phase2: { status: 'pending', duration: 0 },
        phase3: { status: 'pending', duration: 0 },
        phase4: { status: 'pending', duration: 0 }
      }
    };
    
    // Performance monitoring
    this.performanceInterval = null;
    this.reconnectionAttempts = new Map();
  }

  /**
   * Enhanced client creation with resilience features
   */
  async createClient(userId, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for user ${userId}`));
      }, options.timeout || 15000); // 15 second timeout

      const client = ioClient(SERVER_URL, {
        query: { userId },
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        transports: ['websocket'],
        forceNew: true,
        ...options.socketOptions
      });

      client.on('connect', () => {
        clearTimeout(timeout);
        const connectionTime = Date.now() - startTime;
        this.stats.connectionTimes.push(connectionTime);
        this.stats.connected++;
        
        // Setup message handlers
        this.setupClientHandlers(client, userId);
        
        console.log(`✅ ${userId} connected in ${connectionTime}ms (Total: ${this.stats.connected})`);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.stats.errors++;
        console.error(`❌ ${userId} connection failed:`, error.message);
        reject(error);
      });

      client.on('disconnect', (reason) => {
        this.stats.disconnected++;
        this.stats.connected--;
        console.log(`👋 ${userId} disconnected: ${reason} (Active: ${this.stats.connected})`);
        
        // Track reconnection attempts
        if (reason !== 'io client disconnect') {
          const attempts = this.reconnectionAttempts.get(userId) || 0;
          this.reconnectionAttempts.set(userId, attempts + 1);
        }
      });
    });
  }

  /**
   * Setup enhanced client event handlers
   */
  setupClientHandlers(client, userId) {
    // Join user room
    client.emit('join_user_room', userId);
    
    // Handle incoming messages
    client.on('newMessage', (data) => {
      const latency = Date.now() - (data.timestamp || Date.now());
      this.stats.messageLatencies.push(Math.max(0, latency));
    });

    // Handle typing indicators
    client.on('typing', (data) => {
      // Simulate realistic typing response
      if (Math.random() < 0.1) { // 10% chance to respond to typing
        setTimeout(() => {
          client.emit('typing', { receiverId: data.senderId, isTyping: true });
          setTimeout(() => {
            client.emit('typing', { receiverId: data.senderId, isTyping: false });
          }, 2000);
        }, 500);
      }
    });
  }

  /**
   * Phase 1: Gradual connection buildup with resilience
   */
  async phase1_gradualConnection() {
    console.log('\n🔍 Starting Phase 1: Resilient Gradual Connection');
    const phaseStart = Date.now();
    this.stats.phases.phase1.status = 'running';

    const { maxUsers, batchSize, batchDelay } = TEST_CONFIG.phase1;
    const totalBatches = Math.ceil(maxUsers / batchSize);

    console.log(`\n📡 PHASE 1: Gradual Connection (${maxUsers} users in ${batchSize}-user batches)`);

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, maxUsers);
      const currentBatchSize = batchEnd - batchStart;

      console.log(`🔄 Batch ${batch + 1}/${totalBatches}: Connecting ${currentBatchSize} users...`);

      // Connect batch with individual error handling
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const promise = this.createClient(`resilient_user_${i}`).catch(error => {
          console.warn(`⚠️  Failed to connect user resilient_user_${i}: ${error.message}`);
          return null; // Don't fail the entire batch
        });
        batchPromises.push(promise);
      }

      const batchClients = await Promise.all(batchPromises);
      const successfulClients = batchClients.filter(client => client !== null);
      
      this.clients.push(...successfulClients);
      
      const successRate = (successfulClients.length / currentBatchSize * 100).toFixed(1);
      console.log(`✅ Batch ${batch + 1} complete: ${successfulClients.length}/${currentBatchSize} connected (${successRate}% success rate, Total: ${this.stats.connected}/${maxUsers})`);

      // Adaptive delay based on success rate
      const adaptiveDelay = successRate < 90 ? batchDelay * 1.5 : batchDelay;
      if (batch < totalBatches - 1) {
        await this.delay(adaptiveDelay);
      }
    }

    this.stats.phases.phase1.duration = Date.now() - phaseStart;
    this.stats.phases.phase1.status = 'completed';
    
    const successRate = (this.stats.connected / maxUsers * 100).toFixed(1);
    console.log(`📊 Phase 1 Complete: ${this.stats.connected}/${maxUsers} connections (${successRate}% success rate)`);
  }

  /**
   * Phase 2: Realistic sustained load with natural disconnections
   */
  async phase2_sustainedLoad() {
    console.log('\n🔍 Starting Phase 2: Realistic Sustained Load');
    const phaseStart = Date.now();
    this.stats.phases.phase2.status = 'running';

    const { duration, messageInterval, disconnectionRate } = TEST_CONFIG.phase2;
    
    console.log(`\n📈 PHASE 2: Sustained Load Testing (${duration/1000}s)`);
    console.log(`👥 Active Users: ${this.stats.connected}`);
    console.log(`💬 Message Interval: ${messageInterval/1000}s`);
    console.log(`📉 Natural Disconnection Rate: ${(disconnectionRate*100).toFixed(1)}%`);

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Message sending simulation
    const messagePromise = this.simulateRealisticMessaging(messageInterval);
    
    // Natural disconnection simulation
    const disconnectionPromise = this.simulateNaturalDisconnections(disconnectionRate);
    
    // Wait for sustained load duration
    await this.delay(duration);

    this.stats.phases.phase2.duration = Date.now() - phaseStart;
    this.stats.phases.phase2.status = 'completed';
    
    console.log(`📊 Phase 2 Complete: ${this.stats.connected} active connections maintained`);
    
    // Stop background processes
    clearInterval(this.performanceInterval);
  }

  /**
   * Enhanced performance monitoring
   */
  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const avgConnectionTime = this.stats.connectionTimes.length > 0 
        ? (this.stats.connectionTimes.reduce((a, b) => a + b, 0) / this.stats.connectionTimes.length).toFixed(2)
        : 0;
      const avgMessageLatency = this.stats.messageLatencies.length > 0
        ? (this.stats.messageLatencies.reduce((a, b) => a + b, 0) / this.stats.messageLatencies.length).toFixed(2)
        : 0;
      
      console.log(`📊 [Monitor] Active: ${this.stats.connected} | Memory: ${(memUsage.rss/1024/1024).toFixed(1)}MB | Avg Connection: ${avgConnectionTime}ms | Avg Latency: ${avgMessageLatency}ms`);
    }, 15000); // Every 15 seconds
  }

  /**
   * Simulate realistic messaging patterns
   */
  async simulateRealisticMessaging(interval) {
    const messageTypes = ['Hello!', 'How are you?', 'Test message', '👍', 'Great!'];
    
    const sendMessages = () => {
      const activeClients = this.clients.filter(client => client && client.connected);
      const messagingClients = activeClients.slice(0, Math.min(50, activeClients.length)); // Only 50 users send messages
      
      messagingClients.forEach((client, index) => {
        if (Math.random() < 0.3) { // 30% chance to send a message
          const message = messageTypes[Math.floor(Math.random() * messageTypes.length)];
          const recipientIndex = Math.floor(Math.random() * activeClients.length);
          const recipient = activeClients[recipientIndex];
          
          if (recipient && recipient !== client) {
            // Add timestamp for latency measurement
            client.emit('sendMessage', { 
              text: message, 
              receiverId: `user_${recipientIndex}`,
              timestamp: Date.now()
            });
            this.stats.messages++;
          }
        }
      });
    };

    // Send messages at intervals
    const messageInterval = setInterval(sendMessages, interval);
    
    // Stop after phase 2
    setTimeout(() => clearInterval(messageInterval), TEST_CONFIG.phase2.duration);
  }

  /**
   * Simulate natural disconnections and reconnections
   */
  async simulateNaturalDisconnections(rate) {
    const disconnectUsers = () => {
      const activeClients = this.clients.filter(client => client && client.connected);
      const disconnectCount = Math.floor(activeClients.length * rate);
      
      for (let i = 0; i < disconnectCount; i++) {
        const randomIndex = Math.floor(Math.random() * activeClients.length);
        const client = activeClients[randomIndex];
        if (client && client.connected) {
          client.disconnect();
          
          // Simulate reconnection attempt after random delay
          setTimeout(async () => {
            try {
              client.connect();
            } catch (error) {
              console.warn(`⚠️  Reconnection failed: ${error.message}`);
            }
          }, Math.random() * 10000 + 5000); // 5-15 second delay
        }
      }
    };

    // Simulate disconnections every 30 seconds
    const disconnectionInterval = setInterval(disconnectUsers, 30000);
    
    // Stop after phase 2
    setTimeout(() => clearInterval(disconnectionInterval), TEST_CONFIG.phase2.duration);
  }

  /**
   * Phase 3: Careful stress testing
   */
  async phase3_carefulStressBurst() {
    console.log('\n🔍 Starting Phase 3: Careful Stress Burst');
    const phaseStart = Date.now();
    this.stats.phases.phase3.status = 'running';

    const { additionalUsers, batchSize, batchDelay } = TEST_CONFIG.phase3;
    const totalBatches = Math.ceil(additionalUsers / batchSize);
    const currentUserCount = this.stats.connected;

    console.log(`\n🚀 PHASE 3: Stress Burst (+${additionalUsers} users in ${batchSize}-user batches)`);
    console.log(`📊 Current Active Users: ${currentUserCount}`);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, additionalUsers);
      const currentBatchSize = batchEnd - batchStart;

      console.log(`🔄 Stress Batch ${batch + 1}/${totalBatches}: Adding ${currentBatchSize} users...`);

      // More conservative connection approach for stress testing
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const promise = this.createClient(`stress_user_${i}`, { timeout: 20000 }).catch(error => {
          console.warn(`⚠️  Stress connection failed for stress_user_${i}: ${error.message}`);
          return null;
        });
        batchPromises.push(promise);
        
        // Small delay between individual connections in stress phase
        await this.delay(100);
      }

      const batchClients = await Promise.all(batchPromises);
      const successfulClients = batchClients.filter(client => client !== null);
      
      this.clients.push(...successfulClients);
      
      const successRate = (successfulClients.length / currentBatchSize * 100).toFixed(1);
      console.log(`✅ Stress Batch ${batch + 1} complete: ${successfulClients.length}/${currentBatchSize} connected (${successRate}% success rate)`);
      console.log(`📊 Total Active Users: ${this.stats.connected}`);

      // Check if we're hitting server limits
      if (successRate < 70) {
        console.warn(`⚠️  Success rate dropping (${successRate}%), server may be at capacity`);
        console.log(`🛑 Stopping stress test to prevent server overload`);
        break;
      }

      if (batch < totalBatches - 1) {
        await this.delay(batchDelay);
      }
    }

    this.stats.phases.phase3.duration = Date.now() - phaseStart;
    this.stats.phases.phase3.status = 'completed';
    
    console.log(`📊 Phase 3 Complete: Peak concurrent users: ${this.stats.connected}`);
  }

  /**
   * Phase 4: Graceful cleanup
   */
  async phase4_gracefulCleanup() {
    console.log('\n🔍 Starting Phase 4: Graceful Cleanup');
    const phaseStart = Date.now();
    this.stats.phases.phase4.status = 'running';

    const { disconnectBatchSize, disconnectDelay } = TEST_CONFIG.phase4;
    const activeClients = this.clients.filter(client => client && client.connected);
    const totalBatches = Math.ceil(activeClients.length / disconnectBatchSize);

    console.log(`\n🧹 PHASE 4: Graceful Cleanup (${activeClients.length} active connections)`);

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * disconnectBatchSize;
      const batchEnd = Math.min(batchStart + disconnectBatchSize, activeClients.length);
      
      console.log(`🔄 Cleanup Batch ${batch + 1}/${totalBatches}: Disconnecting ${batchEnd - batchStart} users...`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const client = activeClients[i];
        if (client && client.connected) {
          client.disconnect();
        }
      }
      
      console.log(`✅ Cleanup Batch ${batch + 1} complete (Remaining: ${this.stats.connected})`);
      
      if (batch < totalBatches - 1) {
        await this.delay(disconnectDelay);
      }
    }

    this.stats.phases.phase4.duration = Date.now() - phaseStart;
    this.stats.phases.phase4.status = 'completed';
    
    console.log(`📊 Phase 4 Complete: All connections cleaned up`);
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const totalDuration = Date.now() - this.stats.startTime;
    const avgConnectionTime = this.stats.connectionTimes.length > 0 
      ? (this.stats.connectionTimes.reduce((a, b) => a + b, 0) / this.stats.connectionTimes.length).toFixed(2)
      : 0;
    const avgMessageLatency = this.stats.messageLatencies.length > 0
      ? (this.stats.messageLatencies.reduce((a, b) => a + b, 0) / this.stats.messageLatencies.length).toFixed(2)
      : 0;
    const maxConnectionTime = Math.max(...this.stats.connectionTimes) || 0;
    const reconnectionAttempts = Array.from(this.reconnectionAttempts.values()).reduce((a, b) => a + b, 0);

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESILIENT STRESS TEST COMPLETE - COMPREHENSIVE REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📈 OVERALL PERFORMANCE METRICS:');
    console.log(`⏱️  Total Test Duration: ${(totalDuration/1000/60).toFixed(1)} minutes`);
    console.log(`🎯 Peak Concurrent Users: ${Math.max(...this.stats.connectionTimes.map(() => this.stats.connected))}`);
    console.log(`📊 Connection Success Rate: ${((this.stats.connectionTimes.length / (this.stats.connectionTimes.length + this.stats.errors)) * 100).toFixed(1)}%`);
    console.log(`⚡ Average Connection Time: ${avgConnectionTime}ms`);
    console.log(`🐌 Max Connection Time: ${maxConnectionTime}ms`);
    console.log(`📨 Total Messages: ${this.stats.messages}`);
    console.log(`📡 Average Message Latency: ${avgMessageLatency}ms`);
    console.log(`🔄 Reconnection Attempts: ${reconnectionAttempts}`);
    console.log(`❌ Total Errors: ${this.stats.errors}`);

    console.log('\n⏱️  PHASE BREAKDOWN:');
    Object.entries(this.stats.phases).forEach(([phase, data]) => {
      console.log(`${phase}: ${data.status} (${(data.duration/1000).toFixed(1)}s)`);
    });

    console.log('\n🎯 PERFORMANCE ASSESSMENT:');
    if (avgConnectionTime < 1000 && this.stats.errors < 50) {
      console.log('🟢 EXCELLENT: System handles load very well');
    } else if (avgConnectionTime < 2000 && this.stats.errors < 100) {
      console.log('🟡 GOOD: System performs acceptably under load');
    } else if (avgConnectionTime < 5000) {
      console.log('🟠 FAIR: System shows strain but remains functional');
    } else {
      console.log('🔴 POOR: System struggles significantly under load');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    if (avgConnectionTime > 2000) {
      console.log('• Consider optimizing connection handling');
      console.log('• Review Socket.IO timeout configurations');
    }
    if (this.stats.errors > 50) {
      console.log('• Investigate connection error patterns');
      console.log('• Consider implementing connection rate limiting');
    }
    if (reconnectionAttempts > 100) {
      console.log('• Review ping/pong timeout settings');
      console.log('• Consider implementing better connection stability measures');
    }

    return {
      totalDuration,
      avgConnectionTime: parseFloat(avgConnectionTime),
      maxConnectionTime,
      avgMessageLatency: parseFloat(avgMessageLatency),
      totalMessages: this.stats.messages,
      totalErrors: this.stats.errors,
      reconnectionAttempts,
      phases: this.stats.phases
    };
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run the complete resilient stress test
   */
  async run() {
    console.log('🚀 RESILIENT CHAT APPLICATION STRESS TEST');
    console.log('==========================================');
    console.log(`📍 Server: ${SERVER_URL}`);
    console.log(`📅 Start Time: ${new Date().toLocaleString()}`);
    
    try {
      await this.phase1_gradualConnection();
      await this.phase2_sustainedLoad();
      await this.phase3_carefulStressBurst();
      await this.delay(5000); // Brief pause before cleanup
      await this.phase4_gracefulCleanup();
      
      return this.generateReport();
    } catch (error) {
      console.error('💥 Stress test failed:', error);
      console.log('\n🧹 Cleaning up connections...');
      await this.phase4_gracefulCleanup();
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${__filename}`) {
  const stressTest = new ResilientStressTest();
  stressTest.run().catch(console.error);
}

export default ResilientStressTest;