import redisManager from "../lib/redis.js";

// Performance metrics storage
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      totalResponseTime: 0,
      errors: 0,
      activeConnections: 0,
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Reset metrics every minute
    setInterval(() => {
      this.logMetrics();
      this.resetMetrics();
    }, 60000);
  }
  
  resetMetrics() {
    this.metrics = {
      requests: 0,
      totalResponseTime: 0,
      errors: 0,
      activeConnections: this.metrics.activeConnections, // Keep connection count
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
  
  async logMetrics() {
    const avgResponseTime = this.metrics.requests > 0 
      ? this.metrics.totalResponseTime / this.metrics.requests 
      : 0;
      
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;
    
    const metricsData = {
      timestamp: new Date().toISOString(),
      requests: this.metrics.requests,
      avgResponseTime: Math.round(avgResponseTime),
      errors: this.metrics.errors,
      activeConnections: this.metrics.activeConnections,
      dbQueries: this.metrics.dbQueries,
      cacheHitRate: Math.round(cacheHitRate),
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0
    };
    
    console.log('📊 Performance Metrics:', metricsData);
    
    // Store metrics in Redis for dashboard
    try {
      await redisManager.lpush('performance_metrics', JSON.stringify(metricsData));
      // Keep only last 60 minutes of data
      await redisManager.ltrim('performance_metrics', 0, 59);
    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }
  
  recordRequest(responseTime) {
    this.metrics.requests++;
    this.metrics.totalResponseTime += responseTime;
  }
  
  recordError() {
    this.metrics.errors++;
  }
  
  recordConnection(increment = true) {
    if (increment) {
      this.metrics.activeConnections++;
    } else {
      this.metrics.activeConnections--;
    }
  }
  
  recordDbQuery() {
    this.metrics.dbQueries++;
  }
  
  recordCacheHit() {
    this.metrics.cacheHits++;
  }
  
  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }
}

const performanceMonitor = new PerformanceMonitor();

// Request timing middleware
export const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Increment active connections
  performanceMonitor.recordConnection(true);
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - start;
    performanceMonitor.recordRequest(responseTime);
    
    // Record errors
    if (res.statusCode >= 400) {
      performanceMonitor.recordError();
    }
    
    // Decrement active connections
    performanceMonitor.recordConnection(false);
    
    // Add performance headers only if headers haven't been sent yet
    if (!res.headersSent) {
      res.set({
        'X-Response-Time': `${responseTime}ms`,
        'X-Timestamp': new Date().toISOString()
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Database query monitor
export const dbQueryMonitor = {
  recordQuery: () => {
    performanceMonitor.recordDbQuery();
  }
};

// Cache monitor
export const cacheMonitor = {
  recordHit: () => {
    performanceMonitor.recordCacheHit();
  },
  recordMiss: () => {
    performanceMonitor.recordCacheMiss();
  }
};

// Health check endpoint data
export const getHealthMetrics = async () => {
  try {
    // Get recent metrics from Redis
    const recentMetrics = await redisManager.lrange('performance_metrics', 0, 9);
    const metrics = recentMetrics.map(m => JSON.parse(m));
    
    // Calculate averages
    const avgResponseTime = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length 
      : 0;
      
    const avgCacheHitRate = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length
      : 0;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        activeConnections: performanceMonitor.metrics.activeConnections,
        avgResponseTime: Math.round(avgResponseTime),
        cacheHitRate: Math.round(avgCacheHitRate),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        recent: metrics.slice(0, 5) // Last 5 minutes
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

export default performanceMonitor;