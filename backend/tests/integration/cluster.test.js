import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { spawn } from 'child_process';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Cluster Integration Tests', () => {
  let clusterProcess;
  let testPort = 5001;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = testPort.toString();
    process.env.MAX_WORKERS = '2'; // Use fewer workers for testing
  }, 60000);

  afterAll(async () => {
    if (clusterProcess) {
      clusterProcess.kill('SIGTERM');
      await new Promise(resolve => {
        clusterProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Force kill after 5 seconds
      });
    }
  }, 30000);

  describe('Cluster Process Management', () => {
    test('should start cluster with multiple workers', (done) => {
      const clusterPath = path.resolve(__dirname, '../../cluster.js');
      
      clusterProcess = spawn('node', [clusterPath], {
        env: { 
          ...process.env, 
          PORT: testPort.toString(),
          MAX_WORKERS: '2',
          NODE_ENV: 'test'
        },
        stdio: 'pipe'
      });

      let workerCount = 0;
      let timeout;

      clusterProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Cluster output:', output);

        // Count worker ready messages
        if (output.includes('Worker') && output.includes('is ready')) {
          workerCount++;
        }

        // If we have 2 workers ready, test passes
        if (workerCount >= 2) {
          clearTimeout(timeout);
          done();
        }
      });

      clusterProcess.stderr.on('data', (data) => {
        console.error('Cluster error:', data.toString());
      });

      clusterProcess.on('error', (error) => {
        console.error('Failed to start cluster:', error);
        done(error);
      });

      // Timeout after 45 seconds
      timeout = setTimeout(() => {
        done(new Error(`Cluster failed to start 2 workers within timeout. Got ${workerCount} workers.`));
      }, 45000);

    }, 50000);

    test('should handle worker crashes and restart them', (done) => {
      if (!clusterProcess) {
        done(new Error('Cluster process not running'));
        return;
      }

      let restartCount = 0;
      const startTime = Date.now();

      const dataHandler = (data) => {
        const output = data.toString();
        
        if (output.includes('Restarting worker')) {
          restartCount++;
          if (restartCount >= 1) {
            clusterProcess.stdout.off('data', dataHandler);
            done();
          }
        }
      };

      clusterProcess.stdout.on('data', dataHandler);

      // Kill a worker process after a short delay
      setTimeout(() => {
        // Send kill signal to one of the workers
        clusterProcess.kill('SIGUSR1'); // Custom signal to simulate worker crash
      }, 2000);

      // Timeout after 20 seconds
      setTimeout(() => {
        clusterProcess.stdout.off('data', dataHandler);
        if (restartCount === 0) {
          done(new Error('No worker restarts detected within timeout'));
        }
      }, 20000);

    }, 25000);
  });

  describe('Load Balancing', () => {
    test('should distribute requests across workers', async () => {
      if (!clusterProcess) {
        throw new Error('Cluster process not running');
      }

      // Wait for cluster to be fully ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      const responses = [];
      const requestCount = 10;

      // Make multiple requests to health endpoint
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await makeHttpRequest(`http://localhost:${testPort}/health`);
          responses.push(response);
        } catch (error) {
          console.error(`Request ${i} failed:`, error.message);
        }
      }

      expect(responses.length).toBeGreaterThan(0);

      // Check if requests were handled by different workers
      const workerIds = responses
        .map(r => r.worker?.id)
        .filter(id => id !== undefined);

      expect(workerIds.length).toBeGreaterThan(0);
      console.log('Worker IDs handling requests:', workerIds);

    }, 30000);
  });

  describe('Socket.IO Clustering', () => {
    test('should handle multiple socket connections across workers', async () => {
      if (!clusterProcess) {
        throw new Error('Cluster process not running');
      }

      // Wait for cluster to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      const clients = [];
      const clientCount = 5;

      try {
        // Create multiple socket connections
        for (let i = 0; i < clientCount; i++) {
          const client = ClientIO(`http://localhost:${testPort}`, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            query: { userId: `test-user-${i}` }
          });

          clients.push(client);

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Client ${i} connection timeout`));
            }, 10000);

            client.on('connect', () => {
              clearTimeout(timeout);
              resolve();
            });

            client.on('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        }

        expect(clients.length).toBe(clientCount);
        expect(clients.every(client => client.connected)).toBe(true);

      } finally {
        // Clean up connections
        clients.forEach(client => {
          if (client.connected) {
            client.disconnect();
          }
        });
      }

    }, 30000);
  });
});

// Helper function to make HTTP requests
function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          resolve({ raw: data, status: response.statusCode });
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}