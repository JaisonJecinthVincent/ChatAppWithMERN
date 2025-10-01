import redisManager from './redis.js';

/**
 * Query Performance Monitor
 * Tracks database query performance and provides metrics via Redis
 */
class QueryPerformanceMonitor {
  constructor() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      queryTypes: {}
    };
  }

  /**
   * Monitor MongoDB query performance
   * @param {string} operation - Query operation (find, findOne, etc.)
   * @param {string} collection - MongoDB collection name
   * @param {object} query - Query object
   * @param {function} queryFunction - The actual query function to execute
   */
  async monitorQuery(operation, collection, query, queryFunction) {
    const startTime = process.hrtime.bigint();
    const queryKey = `${collection}.${operation}`;
    
    try {
      // Execute the query
      const result = await queryFunction();
      
      // Calculate execution time
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      // Update metrics
      this.updateMetrics(queryKey, executionTime);
      
      // Log slow queries (>100ms)
      if (executionTime > 100) {
        console.warn(`🐌 Slow Query Alert: ${queryKey} took ${executionTime.toFixed(2)}ms`);
        console.warn(`Query: ${JSON.stringify(query)}`);
        this.metrics.slowQueries++;
      }
      
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;
      
      console.error(`❌ Query Error: ${queryKey} failed after ${executionTime.toFixed(2)}ms`);
      console.error(`Query: ${JSON.stringify(query)}`);
      console.error(`Error: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics(queryKey, executionTime) {
    this.metrics.totalQueries++;
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) + executionTime) / 
      this.metrics.totalQueries;
    
    // Update query type metrics
    if (!this.metrics.queryTypes[queryKey]) {
      this.metrics.queryTypes[queryKey] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity
      };
    }
    
    const queryStats = this.metrics.queryTypes[queryKey];
    queryStats.count++;
    queryStats.totalTime += executionTime;
    queryStats.averageTime = queryStats.totalTime / queryStats.count;
    queryStats.maxTime = Math.max(queryStats.maxTime, executionTime);
    queryStats.minTime = Math.min(queryStats.minTime, executionTime);
  }

  /**
   * Store metrics in Redis for monitoring dashboard
   */
  async storeMetrics() {
    try {
      const timestamp = Date.now();
      const metricsData = {
        ...this.metrics,
        timestamp,
        serverId: process.env.SERVER_ID || 'unknown'
      };
      
      // Store current metrics
      await redisManager.setex('query_performance:current', 300, JSON.stringify(metricsData));
      
      // Store in time series for trending (keep last 24 hours)
      await redisManager.lpush('query_performance:history', JSON.stringify(metricsData));
      await redisManager.ltrim('query_performance:history', 0, 288); // 24 hours * 12 (5min intervals)
      
    } catch (error) {
      console.error('Failed to store query metrics:', error.message);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      slowQueryPercentage: (this.metrics.slowQueries / Math.max(this.metrics.totalQueries, 1) * 100).toFixed(2)
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      queryTypes: {}
    };
  }

  /**
   * Print performance report
   */
  printReport() {
    console.log('\n📊 Query Performance Report:');
    console.log(`Total Queries: ${this.metrics.totalQueries}`);
    console.log(`Slow Queries: ${this.metrics.slowQueries} (${((this.metrics.slowQueries / Math.max(this.metrics.totalQueries, 1)) * 100).toFixed(2)}%)`);
    console.log(`Average Response Time: ${this.metrics.averageResponseTime.toFixed(2)}ms`);
    
    console.log('\n📈 Query Types Performance:');
    for (const [queryType, stats] of Object.entries(this.metrics.queryTypes)) {
      console.log(`${queryType}: ${stats.count} queries, avg: ${stats.averageTime.toFixed(2)}ms, max: ${stats.maxTime.toFixed(2)}ms`);
    }
    console.log('');
  }
}

// Create global instance
const queryPerformanceMonitor = new QueryPerformanceMonitor();

// Store metrics every 5 minutes
setInterval(() => {
  queryPerformanceMonitor.storeMetrics();
}, 5 * 60 * 1000);

// Print report every 10 minutes
setInterval(() => {
  queryPerformanceMonitor.printReport();
}, 10 * 60 * 1000);

export default queryPerformanceMonitor;