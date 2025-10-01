import cluster from 'cluster';
import redisManager from './redis.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responses: [],
      startTime: Date.now(),
      lastMinuteRequests: 0,
      lastMinuteErrors: 0,
      lastMinuteStart: Date.now()
    };
    
    this.isRunning = false;
    this.monitoringInterval = null;
  }

  // Middleware to track request metrics
  middleware = (req, res, next) => {
    const startTime = Date.now();
    this.metrics.requests++;
    this.metrics.lastMinuteRequests++;

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = (...args) => {
      const responseTime = Date.now() - startTime;
      
      // Store response time (keep last 1000 responses)
      this.metrics.responses.push({
        time: responseTime,
        status: res.statusCode,
        timestamp: Date.now()
      });
      
      if (this.metrics.responses.length > 1000) {
        this.metrics.responses.shift();
      }
      
      // Track errors
      if (res.statusCode >= 400) {
        this.metrics.errors++;
        this.metrics.lastMinuteErrors++;
      }
      
      // Call original end method
      originalEnd.apply(res, args);
    };
    
    next();
  };

  // Start performance monitoring
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('📊 Performance monitoring started');
    
    // Store metrics in Redis every 60 seconds
    this.monitoringInterval = setInterval(() => {
      this.storeMetrics();
      this.resetMinuteCounters();
    }, 60000);
  }

  // Stop performance monitoring
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('📊 Performance monitoring stopped');
  }

  // Reset per-minute counters
  resetMinuteCounters() {
    this.metrics.lastMinuteRequests = 0;
    this.metrics.lastMinuteErrors = 0;
    this.metrics.lastMinuteStart = Date.now();
  }

  // Store metrics in Redis
  async storeMetrics() {
    try {
      const workerId = process.env.WORKER_ID || 'main';
      const timestamp = Date.now();
      
      const metrics = {
        workerId,
        timestamp,
        requests: this.metrics.lastMinuteRequests,
        errors: this.metrics.lastMinuteErrors,
        averageResponseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        uptime: this.getUptime()
      };
      
      await redisManager.setCache(`metrics:${workerId}:${timestamp}`, metrics, 3600); // Store for 1 hour
      
    } catch (error) {
      console.error('❌ Failed to store metrics:', error.message);
    }
  }

  // Get current metrics
  getMetrics() {
    const uptime = this.getUptime();
    const totalRequests = this.metrics.requests;
    const totalErrors = this.metrics.errors;
    
    return {
      workerId: process.env.WORKER_ID || 'main',
      uptime,
      totalRequests,
      totalErrors,
      requestsPerMinute: this.metrics.lastMinuteRequests,
      errorsPerMinute: this.metrics.lastMinuteErrors,
      averageResponseTime: this.getAverageResponseTime(),
      medianResponseTime: this.getMedianResponseTime(),
      p95ResponseTime: this.getPercentileResponseTime(95),
      errorRate: this.getErrorRate(),
      requestsPerSecond: totalRequests / (uptime / 1000),
      timestamp: Date.now()
    };
  }

  // Calculate average response time
  getAverageResponseTime() {
    if (this.metrics.responses.length === 0) return 0;
    
    const total = this.metrics.responses.reduce((sum, response) => sum + response.time, 0);
    return Math.round(total / this.metrics.responses.length);
  }

  // Calculate median response time
  getMedianResponseTime() {
    if (this.metrics.responses.length === 0) return 0;
    
    const times = this.metrics.responses.map(r => r.time).sort((a, b) => a - b);
    const mid = Math.floor(times.length / 2);
    
    return times.length % 2 === 0 
      ? Math.round((times[mid - 1] + times[mid]) / 2)
      : times[mid];
  }

  // Calculate percentile response time
  getPercentileResponseTime(percentile) {
    if (this.metrics.responses.length === 0) return 0;
    
    const times = this.metrics.responses.map(r => r.time).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * times.length) - 1;
    
    return times[Math.max(0, index)] || 0;
  }

  // Calculate error rate
  getErrorRate() {
    if (this.metrics.requests === 0) return 0;
    return Math.round((this.metrics.errors / this.metrics.requests) * 100 * 100) / 100;
  }

  // Get uptime in milliseconds
  getUptime() {
    return Date.now() - this.metrics.startTime;
  }

  // Get aggregated metrics from all workers (via Redis)
  async getClusterMetrics() {
    try {
      const keys = await redisManager.getRawRedis().keys('metrics:*');
      const now = Date.now();
      const oneHourAgo = now - 3600000; // 1 hour
      
      // Filter recent metrics
      const recentKeys = keys.filter(key => {
        const timestamp = parseInt(key.split(':')[2]);
        return timestamp > oneHourAgo;
      });
      
      if (recentKeys.length === 0) {
        return this.getMetrics();
      }
      
      const metrics = await Promise.all(
        recentKeys.map(key => redisManager.getCache(key))
      );
      
      const validMetrics = metrics.filter(Boolean);
      
      if (validMetrics.length === 0) {
        return this.getMetrics();
      }
      
      // Aggregate metrics
      const totalRequests = validMetrics.reduce((sum, m) => sum + m.requests, 0);
      const totalErrors = validMetrics.reduce((sum, m) => sum + m.errors, 0);
      const avgResponseTime = Math.round(
        validMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / validMetrics.length
      );
      
      return {
        cluster: true,
        totalWorkers: [...new Set(validMetrics.map(m => m.workerId))].length,
        totalRequests,
        totalErrors,
        averageResponseTime: avgResponseTime,
        errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0,
        requestsPerMinute: totalRequests,
        timestamp: now
      };
      
    } catch (error) {
      console.error('❌ Failed to get cluster metrics:', error.message);
      return this.getMetrics();
    }
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;