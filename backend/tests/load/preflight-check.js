#!/usr/bin/env node
// Pre-flight check before running load tests
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { performance } from 'perf_hooks';

class PreFlightChecker {
  constructor() {
    this.httpUrl = 'http://localhost:5000';
    this.socketUrl = 'http://localhost:5000';
    this.checks = {
      httpServer: false,
      socketServer: false,
      database: false,
      redis: false,
      clustering: false
    };
  }

  async runAllChecks() {
    console.log('🔍 PRE-FLIGHT CHECKS FOR LOAD TESTING');
    console.log('═════════════════════════════════════════════════');
    
    try {
      await this.checkHttpServer();
      await this.checkSocketServer();
      await this.checkClustering();
      await this.checkSystemResources();
      
      this.generateReport();
      
      if (this.allChecksPass()) {
        console.log('\n✅ ALL CHECKS PASSED - Ready for load testing!');
        return true;
      } else {
        console.log('\n❌ Some checks failed - Please fix issues before load testing');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Pre-flight check failed:', error.message);
      return false;
    }
  }

  async checkHttpServer() {
    console.log('🌐 Checking HTTP server...');
    
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const req = http.get(this.httpUrl + '/api/auth/check', (res) => {
        const responseTime = performance.now() - startTime;
        
        if (res.statusCode === 200 || res.statusCode === 401) {
          console.log(`✅ HTTP server is running (${responseTime.toFixed(2)}ms)`);
          this.checks.httpServer = true;
        } else {
          console.log(`⚠️  HTTP server responded with status ${res.statusCode}`);
        }
        resolve();
      });

      req.on('error', (error) => {
        console.log(`❌ HTTP server not accessible: ${error.message}`);
        resolve();
      });

      req.setTimeout(5000, () => {
        console.log('❌ HTTP server timeout');
        req.destroy();
        resolve();
      });
    });
  }

  async checkSocketServer() {
    console.log('🔌 Checking Socket.IO server...');
    
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const client = ClientIO(this.socketUrl, {
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      const timeout = setTimeout(() => {
        console.log('❌ Socket.IO server timeout');
        client.disconnect();
        resolve();
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        const responseTime = performance.now() - startTime;
        console.log(`✅ Socket.IO server is running (${responseTime.toFixed(2)}ms)`);
        this.checks.socketServer = true;
        client.disconnect();
        resolve();
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log(`❌ Socket.IO server connection failed: ${error.message}`);
        resolve();
      });
    });
  }

  async checkClustering() {
    console.log('⚙️  Checking clustering status...');
    
    // Check if we can detect multiple workers
    return new Promise((resolve) => {
      let workerPids = new Set();
      let requests = 0;
      const maxRequests = 10;
      
      const checkWorker = () => {
        const req = http.get(this.httpUrl + '/api/auth/check', (res) => {
          const workerPid = res.headers['x-worker-pid'];
          if (workerPid) {
            workerPids.add(workerPid);
          }
          
          requests++;
          if (requests < maxRequests) {
            setTimeout(checkWorker, 50); // Small delay between requests
          } else {
            // Analysis
            if (workerPids.size > 1) {
              console.log(`✅ Clustering detected: ${workerPids.size} workers found`);
              this.checks.clustering = true;
            } else if (workerPids.size === 1) {
              console.log(`⚠️  Single worker detected - clustering may not be active`);
            } else {
              console.log(`❌ No worker identification headers found`);
            }
            resolve();
          }
        });

        req.on('error', () => {
          requests++;
          if (requests >= maxRequests) {
            console.log('❌ Could not check clustering status');
            resolve();
          }
        });

        req.setTimeout(2000, () => {
          req.destroy();
          requests++;
          if (requests >= maxRequests) resolve();
        });
      };
      
      checkWorker();
    });
  }

  async checkSystemResources() {
    console.log('💻 Checking system resources...');
    
    const memUsage = process.memoryUsage();
    const freeMemMB = (memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024;
    
    console.log(`   📊 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used, ${freeMemMB.toFixed(1)}MB available`);
    
    if (freeMemMB > 500) {
      console.log('✅ Sufficient memory available');
    } else {
      console.log('⚠️  Low memory - may affect test performance');
    }

    // Check for common ports
    await this.checkPort(5000, 'Application port');
    await this.checkRedisConnection();
  }

  async checkPort(port, description) {
    return new Promise((resolve) => {
      const server = http.createServer();
      
      server.listen(port, () => {
        console.log(`⚠️  Port ${port} (${description}) is available but should be in use`);
        server.close();
        resolve();
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`✅ Port ${port} (${description}) is in use`);
        } else {
          console.log(`❌ Error checking port ${port}: ${error.message}`);
        }
        resolve();
      });
    });
  }

  async checkRedisConnection() {
    // This is a basic check - in a real app you might import your Redis client
    console.log('🔴 Redis connection check - manual verification needed');
    console.log('   Ensure Redis is running on localhost:6379');
  }

  generateReport() {
    console.log('\n📋 CHECK SUMMARY:');
    console.log('═════════════════════════════════════════════════');
    
    Object.entries(this.checks).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      const name = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`   ${status} ${name}`);
    });
  }

  allChecksPass() {
    return this.checks.httpServer && this.checks.socketServer;
  }

  generateLoadTestPlan() {
    console.log('\n🎯 RECOMMENDED LOAD TEST PLAN:');
    console.log('═════════════════════════════════════════════════');
    
    if (this.checks.clustering) {
      console.log('📈 With clustering active, recommended test progression:');
      console.log('   1. Small test:  npm run test:stress:small  (500 users)');
      console.log('   2. Medium test: npm run test:stress:medium (1500 users)');  
      console.log('   3. Large test:  npm run test:stress:large  (2500 users)');
      console.log('   4. XL test:     npm run test:stress:xlarge (5000 users)');
    } else {
      console.log('⚠️  Without clustering, recommended conservative tests:');
      console.log('   1. Start with: npm run test:stress:small (500 users)');
      console.log('   2. Monitor performance carefully');
    }
    
    console.log('\n📊 Additional HTTP load testing:');
    console.log('   - npm run test:load (Artillery HTTP test)');
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   - Monitor CPU, memory, and network during tests');
    console.log('   - Ensure MongoDB and Redis are running');
    console.log('   - Close unnecessary applications');
    console.log('   - Tests may take 5-10 minutes to complete');
  }
}

// Main execution
async function runPreFlightCheck() {
  const checker = new PreFlightChecker();
  const success = await checker.runAllChecks();
  
  if (success) {
    checker.generateLoadTestPlan();
  }
  
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPreFlightCheck().catch(console.error);
}

export default PreFlightChecker;