import { messageQueue, notificationQueue, emailQueue } from './queue.js';

// Queue monitoring utilities
export class QueueMonitor {
  static async getQueueHealth() {
    try {
      const [messageHealth, notificationHealth, emailHealth] = await Promise.all([
        this.getQueueHealthStatus(messageQueue, 'message'),
        this.getQueueHealthStatus(notificationQueue, 'notification'),
        this.getQueueHealthStatus(emailQueue, 'email'),
      ]);

      return {
        overall: 'healthy',
        queues: {
          message: messageHealth,
          notification: notificationHealth,
          email: emailHealth,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting queue health:', error);
      return {
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  static async getQueueHealthStatus(queue, queueName) {
    try {
      const counts = await queue.getJobCounts();
      const isHealthy = counts.failed < 10 && counts.active < 100;
      
      return {
        name: queueName,
        healthy: isHealthy,
        counts,
        status: isHealthy ? 'healthy' : 'warning',
      };
    } catch (error) {
      return {
        name: queueName,
        healthy: false,
        error: error.message,
        status: 'error',
      };
    }
  }

  static async getQueueMetrics() {
    try {
      const [messageMetrics, notificationMetrics, emailMetrics] = await Promise.all([
        this.getQueueMetrics(queue, 'message'),
        this.getQueueMetrics(notificationQueue, 'notification'),
        this.getQueueMetrics(emailQueue, 'email'),
      ]);

      return {
        message: messageMetrics,
        notification: notificationMetrics,
        email: emailMetrics,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting queue metrics:', error);
      throw error;
    }
  }

  static async getQueueMetrics(queue, queueName) {
    try {
      const counts = await queue.getJobCounts();
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      return {
        name: queueName,
        counts,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        oldestWaiting: waiting.length > 0 ? new Date(waiting[0].timestamp) : null,
        oldestActive: active.length > 0 ? new Date(active[0].timestamp) : null,
      };
    } catch (error) {
      console.error(`Error getting metrics for ${queueName} queue:`, error);
      return {
        name: queueName,
        error: error.message,
      };
    }
  }

  static async clearFailedJobs(queueName) {
    try {
      let queue;
      switch (queueName) {
        case 'message':
          queue = messageQueue;
          break;
        case 'notification':
          queue = notificationQueue;
          break;
        case 'email':
          queue = emailQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const failedJobs = await queue.getFailed();
      await queue.clean(0, 'failed');
      
      return {
        success: true,
        clearedCount: failedJobs.length,
        queue: queueName,
      };
    } catch (error) {
      console.error(`Error clearing failed jobs for ${queueName}:`, error);
      return {
        success: false,
        error: error.message,
        queue: queueName,
      };
    }
  }

  static async retryFailedJobs(queueName, jobId = null) {
    try {
      let queue;
      switch (queueName) {
        case 'message':
          queue = messageQueue;
          break;
        case 'notification':
          queue = notificationQueue;
          break;
        case 'email':
          queue = emailQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      if (jobId) {
        // Retry specific job
        const job = await queue.getJob(jobId);
        if (!job) {
          throw new Error(`Job ${jobId} not found`);
        }
        await job.retry();
        return {
          success: true,
          retriedJob: jobId,
          queue: queueName,
        };
      } else {
        // Retry all failed jobs
        const failedJobs = await queue.getFailed();
        const retryPromises = failedJobs.map(job => job.retry());
        await Promise.all(retryPromises);
        
        return {
          success: true,
          retriedCount: failedJobs.length,
          queue: queueName,
        };
      }
    } catch (error) {
      console.error(`Error retrying failed jobs for ${queueName}:`, error);
      return {
        success: false,
        error: error.message,
        queue: queueName,
      };
    }
  }
}

// Periodic health check
setInterval(async () => {
  try {
    const health = await QueueMonitor.getQueueHealth();
    if (health.overall !== 'healthy') {
      console.warn('⚠️ Queue health check failed:', health);
    }
  } catch (error) {
    console.error('❌ Queue health check error:', error);
  }
}, 60000); // Check every minute

export default QueueMonitor;



