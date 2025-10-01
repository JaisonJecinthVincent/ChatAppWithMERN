import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const numCPUs = os.cpus().length;
const isDev = process.env.NODE_ENV !== 'production';

// In development, use fewer workers to avoid overwhelming the system
const workerCount = isDev ? Math.min(2, numCPUs) : numCPUs;

console.log(`🖥️  System has ${numCPUs} CPUs`);
console.log(`🚀 Starting ${workerCount} worker processes...`);

if (cluster.isPrimary) {
  console.log(`📋 Master process ${process.pid} is running`);
  
  // Track worker statistics
  const workerStats = {
    totalRequests: 0,
    totalErrors: 0,
    startTime: Date.now(),
    workers: new Map()
  };

  // Fork workers
  for (let i = 0; i < workerCount; i++) {
    const worker = cluster.fork();
    workerStats.workers.set(worker.id, {
      pid: worker.process.pid,
      requests: 0,
      errors: 0,
      startTime: Date.now()
    });
    
    console.log(`👷 Worker ${worker.id} (PID: ${worker.process.pid}) started`);
  }

  // Handle worker messages for statistics
  cluster.on('message', (worker, message) => {
    if (message.type === 'stats') {
      const workerStat = workerStats.workers.get(worker.id);
      if (workerStat) {
        workerStat.requests += message.data.requests || 0;
        workerStat.errors += message.data.errors || 0;
        workerStats.totalRequests += message.data.requests || 0;
        workerStats.totalErrors += message.data.errors || 0;
      }
    }
  });

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`💀 Worker ${worker.id} (PID: ${worker.process.pid}) died with code ${code} and signal ${signal}`);
    
    // Remove from stats
    workerStats.workers.delete(worker.id);
    
    // Restart worker
    console.log('🔄 Starting a new worker...');
    const newWorker = cluster.fork();
    workerStats.workers.set(newWorker.id, {
      pid: newWorker.process.pid,
      requests: 0,
      errors: 0,
      startTime: Date.now()
    });
    console.log(`👷 New worker ${newWorker.id} (PID: ${newWorker.process.pid}) started`);
  });

  // Log statistics every 30 seconds
  setInterval(() => {
    const uptime = (Date.now() - workerStats.startTime) / 1000;
    const requestsPerSecond = workerStats.totalRequests / uptime;
    const errorRate = workerStats.totalRequests > 0 ? (workerStats.totalErrors / workerStats.totalRequests) * 100 : 0;
    
    console.log('\n📊 Cluster Statistics:');
    console.log(`   Total Workers: ${workerStats.workers.size}`);
    console.log(`   Total Requests: ${workerStats.totalRequests}`);
    console.log(`   Requests/sec: ${requestsPerSecond.toFixed(2)}`);
    console.log(`   Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`   Uptime: ${Math.floor(uptime)}s`);
    
    // Per-worker stats
    workerStats.workers.forEach((stats, workerId) => {
      const workerUptime = (Date.now() - stats.startTime) / 1000;
      const workerRps = stats.requests / workerUptime;
      console.log(`   Worker ${workerId}: ${stats.requests} reqs (${workerRps.toFixed(2)}/s)`);
    });
  }, 30000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    
    // Disconnect all workers
    Object.values(cluster.workers).forEach(worker => {
      worker.disconnect();
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('💀 Force exiting...');
      process.exit(0);
    }, 10000);
  });

} else {
  // Worker process - import the main application
  console.log(`👷 Worker ${cluster.worker.id} (PID: ${process.pid}) starting...`);
  
  // Statistics tracking for this worker
  let requestCount = 0;
  let errorCount = 0;
  
  // Send stats to master every 10 seconds
  setInterval(() => {
    if (process.send) {
      process.send({
        type: 'stats',
        data: {
          requests: requestCount,
          errors: errorCount
        }
      });
      // Reset counters
      requestCount = 0;
      errorCount = 0;
    }
  }, 10000);

  // Set environment variable to identify worker
  process.env.WORKER_ID = cluster.worker.id.toString();
  process.env.WORKER_PID = process.pid.toString();
  
  // Import and start the main application
  import('./app.js');
}