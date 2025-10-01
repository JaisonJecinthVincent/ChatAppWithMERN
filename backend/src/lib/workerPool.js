import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the correct path to the workers directory
const workersDir = path.join(__dirname, '..', 'workers');

class WorkerPool {
  constructor(workerScript, poolSize = os.cpus().length) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.nextWorkerIndex = 0;
    
    // Statistics
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeWorkers: 0,
      queueSize: 0
    };
    
    this.initialize();
  }

  initialize() {
    console.log(`🧵 Initializing worker pool with ${this.poolSize} workers`);
    
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker(i);
    }
  }

  createWorker(id) {
    const worker = new Worker(this.workerScript);
    
    worker.workerId = id;
    worker.isBusy = false;
    worker.tasksCompleted = 0;
    worker.tasksError = 0;
    
    worker.on('message', (result) => {
      worker.isBusy = false;
      this.stats.activeWorkers--;
      
      if (result.success) {
        worker.tasksCompleted++;
        this.stats.completedTasks++;
      } else {
        worker.tasksError++;
        this.stats.failedTasks++;
      }
      
      // Process next task in queue
      this.processQueue();
    });

    worker.on('error', (error) => {
      console.error(`❌ Worker ${id} error:`, error);
      worker.isBusy = false;
      this.stats.activeWorkers--;
      this.stats.failedTasks++;
      
      // Restart the worker
      this.restartWorker(id);
      
      // Process next task in queue
      this.processQueue();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`⚠️  Worker ${id} stopped with exit code ${code}`);
        this.restartWorker(id);
      }
    });

    this.workers[id] = worker;
    console.log(`✅ Worker ${id} created and ready`);
  }

  restartWorker(id) {
    console.log(`🔄 Restarting worker ${id}...`);
    
    // Terminate old worker if still running
    if (this.workers[id]) {
      this.workers[id].terminate();
    }
    
    // Create new worker
    this.createWorker(id);
  }

  execute(taskData, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const task = {
        data: taskData,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: setTimeout(() => {
          reject(new Error(`Task timeout after ${timeout}ms`));
        }, timeout)
      };

      this.queue.push(task);
      this.stats.totalTasks++;
      this.stats.queueSize = this.queue.length;
      
      this.processQueue();
    });
  }

  processQueue() {
    if (this.queue.length === 0) {
      return;
    }

    // Find available worker
    const availableWorker = this.workers.find(worker => !worker.isBusy);
    
    if (!availableWorker) {
      return; // No workers available, wait
    }

    const task = this.queue.shift();
    this.stats.queueSize = this.queue.length;
    
    if (!task) {
      return;
    }

    // Clear timeout since we're processing the task
    clearTimeout(task.timeout);
    
    // Assign task to worker
    availableWorker.isBusy = true;
    this.stats.activeWorkers++;
    
    // Set up response handling
    const handleMessage = (result) => {
      availableWorker.off('message', handleMessage);
      availableWorker.off('error', handleError);
      
      if (result.success) {
        task.resolve(result.data);
      } else {
        task.reject(new Error(result.error || 'Worker task failed'));
      }
    };

    const handleError = (error) => {
      availableWorker.off('message', handleMessage);
      availableWorker.off('error', handleError);
      task.reject(error);
    };

    availableWorker.once('message', handleMessage);
    availableWorker.once('error', handleError);
    
    // Send task to worker
    availableWorker.postMessage(task.data);
  }

  getStats() {
    const workerStats = this.workers.map(worker => ({
      id: worker.workerId,
      isBusy: worker.isBusy,
      tasksCompleted: worker.tasksCompleted,
      tasksError: worker.tasksError
    }));

    return {
      ...this.stats,
      workers: workerStats,
      availableWorkers: this.workers.filter(w => !w.isBusy).length
    };
  }

  async terminate() {
    console.log('🛑 Terminating worker pool...');
    
    // Clear queue
    this.queue.forEach(task => {
      clearTimeout(task.timeout);
      task.reject(new Error('Worker pool terminated'));
    });
    this.queue = [];
    
    // Terminate all workers
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
    
    console.log('✅ Worker pool terminated');
  }
}

// CPU-intensive task worker pool
export class CPUTaskPool extends WorkerPool {
  constructor() {
    super(path.join(workersDir, 'cpu-worker.js'));
  }

  async hashPassword(password) {
    return this.execute({
      type: 'hash_password',
      password
    });
  }

  async comparePassword(password, hashedPassword) {
    return this.execute({
      type: 'compare_password',
      password,
      hashedPassword
    });
  }

  async processImage(imageData, options = {}) {
    return this.execute({
      type: 'process_image',
      imageData,
      options
    });
  }

  async compressData(data, options = {}) {
    return this.execute({
      type: 'compress_data',
      data,
      options
    });
  }
}

// Create global instance
export const cpuTaskPool = new CPUTaskPool();

// Graceful shutdown
process.on('SIGINT', () => {
  cpuTaskPool.terminate();
});

process.on('SIGTERM', () => {
  cpuTaskPool.terminate();
});

export default WorkerPool;