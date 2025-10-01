import express from 'express';
import httpProxy from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';

class LoadBalancer {
  constructor(targets, options = {}) {
    this.targets = targets.map((target, index) => ({
      ...target,
      id: index,
      healthy: true,
      requests: 0,
      errors: 0,
      responseTime: 0,
      lastCheck: Date.now()
    }));
    
    this.algorithm = options.algorithm || 'round-robin';
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.healthCheckPath = options.healthCheckPath || '/health';
    this.maxRetries = options.maxRetries || 3;
    
    this.currentIndex = 0;
    
    // Start health checks
    this.startHealthChecks();
  }

  // Round-robin selection
  roundRobin() {
    const healthyTargets = this.targets.filter(target => target.healthy);
    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }
    
    this.currentIndex = this.currentIndex % healthyTargets.length;
    return healthyTargets[this.currentIndex++];
  }

  // Least connections selection
  leastConnections() {
    const healthyTargets = this.targets.filter(target => target.healthy);
    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }
    
    return healthyTargets.reduce((min, target) => 
      target.requests < min.requests ? target : min
    );
  }

  // Weighted round-robin selection
  weightedRoundRobin() {
    const healthyTargets = this.targets.filter(target => target.healthy);
    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }
    
    // Simple implementation - could be enhanced with actual weight calculation
    return this.roundRobin();
  }

  // Get next target based on algorithm
  getNextTarget() {
    switch (this.algorithm) {
      case 'least-connections':
        return this.leastConnections();
      case 'weighted-round-robin':
        return this.weightedRoundRobin();
      case 'round-robin':
      default:
        return this.roundRobin();
    }
  }

  // Health check implementation
  async checkHealth(target) {
    try {
      const response = await fetch(`${target.url}${this.healthCheckPath}`, {
        method: 'GET',
        timeout: 5000
      });
      
      target.healthy = response.ok;
      target.lastCheck = Date.now();
      
      if (response.ok) {
        console.log(`✅ Target ${target.id} (${target.url}) is healthy`);
      } else {
        console.log(`❌ Target ${target.id} (${target.url}) health check failed: ${response.status}`);
      }
    } catch (error) {
      target.healthy = false;
      target.lastCheck = Date.now();
      console.log(`❌ Target ${target.id} (${target.url}) health check error:`, error.message);
    }
  }

  // Start periodic health checks
  startHealthChecks() {
    console.log(`🏥 Starting health checks every ${this.healthCheckInterval}ms`);
    
    setInterval(() => {
      this.targets.forEach(target => {
        this.checkHealth(target);
      });
    }, this.healthCheckInterval);

    // Initial health check
    this.targets.forEach(target => {
      this.checkHealth(target);
    });
  }

  // Create proxy middleware
  createProxy() {
    return createProxyMiddleware({
      target: 'http://localhost:5001', // Default target
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying
      
      router: (req) => {
        try {
          const target = this.getNextTarget();
          target.requests++;
          
          console.log(`🔄 Routing request to target ${target.id}: ${target.url}`);
          return target.url;
        } catch (error) {
          console.error('❌ Load balancer error:', error.message);
          throw error;
        }
      },
      
      onError: (err, req, res, target) => {
        console.error(`❌ Proxy error for ${target}:`, err.message);
        
        // Find the target and increment error count
        const targetObj = this.targets.find(t => t.url === target);
        if (targetObj) {
          targetObj.errors++;
          // Mark as unhealthy if too many errors
          if (targetObj.errors > this.maxRetries) {
            targetObj.healthy = false;
          }
        }
        
        res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'Please try again later'
        });
      },
      
      onProxyRes: (proxyRes, req, res) => {
        const target = proxyRes.req.agent?.defaultPort || 'unknown';
        console.log(`✅ Response from ${target}: ${proxyRes.statusCode}`);
      }
    });
  }

  // Get load balancer statistics
  getStats() {
    const totalRequests = this.targets.reduce((sum, target) => sum + target.requests, 0);
    const totalErrors = this.targets.reduce((sum, target) => sum + target.errors, 0);
    const healthyCount = this.targets.filter(target => target.healthy).length;
    
    return {
      algorithm: this.algorithm,
      totalTargets: this.targets.length,
      healthyTargets: healthyCount,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      targets: this.targets.map(target => ({
        id: target.id,
        url: target.url,
        healthy: target.healthy,
        requests: target.requests,
        errors: target.errors,
        errorRate: target.requests > 0 ? (target.errors / target.requests) * 100 : 0,
        lastCheck: new Date(target.lastCheck).toISOString()
      }))
    };
  }
}

export default LoadBalancer;