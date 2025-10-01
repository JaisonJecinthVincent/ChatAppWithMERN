import express from 'express';
import cluster from 'cluster';
// import { cpuTaskPool } from '../lib/workerPool.js'; // Temporarily disabled
import { performanceMonitor } from '../lib/performanceMonitor.js';

const router = express.Router();

// Cluster statistics endpoint
router.get('/cluster', (req, res) => {
  if (!cluster.isPrimary) {
    return res.json({
      worker: {
        id: process.env.WORKER_ID || cluster.worker?.id,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  }

  // Master process statistics
  const workers = Object.values(cluster.workers || {}).map(worker => ({
    id: worker.id,
    pid: worker.process.pid,
    state: worker.state,
    isDead: worker.isDead(),
    exitedAfterDisconnect: worker.exitedAfterDisconnect
  }));

  res.json({
    cluster: {
      isPrimary: true,
      workers: workers,
      totalWorkers: workers.length,
      aliveWorkers: workers.filter(w => !w.isDead).length
    }
  });
});

// Worker pool statistics
router.get('/workers', (req, res) => {
  try {
    // const stats = cpuTaskPool.getStats(); // Temporarily disabled
    res.json({
      workerPool: {
        status: 'disabled',
        message: 'Worker threads temporarily disabled - using main thread for now'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get worker pool stats',
      message: error.message
    });
  }
});

// Performance metrics
router.get('/performance', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    res.json({
      performance: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error.message
    });
  }
});

// System information
router.get('/system', (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    system: {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        workerId: process.env.WORKER_ID,
        workerPid: process.env.WORKER_PID
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Comprehensive health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      worker: {
        id: process.env.WORKER_ID || 'main',
        pid: process.pid
      }
    };

    // Check worker pool health
    try {
      // const workerStats = cpuTaskPool.getStats(); // Temporarily disabled
      health.workerPool = {
        status: 'disabled',
        message: 'Worker threads temporarily disabled'
      };
    } catch (error) {
      health.workerPool = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Check performance metrics
    try {
      const perfMetrics = performanceMonitor.getMetrics();
      health.performance = {
        status: 'healthy',
        avgResponseTime: perfMetrics.averageResponseTime,
        errorRate: perfMetrics.errorRate,
        requestsPerMinute: perfMetrics.requestsPerMinute
      };
      
      // Mark as degraded if performance is poor
      if (perfMetrics.averageResponseTime > 1000 || perfMetrics.errorRate > 5) {
        health.performance.status = 'degraded';
        health.status = 'degraded';
      }
    } catch (error) {
      health.performance = {
        status: 'unknown',
        error: error.message
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test worker pool functionality
router.post('/test-workers', async (req, res) => {
  try {
    // Temporarily disabled - simulate worker functionality on main thread
    const { taskType = 'cpu_intensive_task', iterations = 100000 } = req.body;
    
    const startTime = Date.now();
    
    let result;
    switch (taskType) {
      case 'hash_password':
        // Simulate password hashing
        result = 'password-hash-simulation';
        break;
      case 'compress_data':
        // Simulate compression
        result = { compressionRatio: 75, status: 'simulated' };
        break;
      case 'cpu_intensive_task':
        // Actually do some CPU work
        let sum = 0;
        for (let i = 0; i < iterations; i++) {
          sum += Math.sqrt(i) * Math.sin(i);
        }
        result = { result: sum, iterations, completed: true };
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      taskType,
      duration,
      result,
      workerStats: { status: 'main_thread', message: 'Worker threads temporarily disabled' }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      workerStats: { status: 'main_thread', message: 'Worker threads temporarily disabled' }
    });
  }
});

export default router;