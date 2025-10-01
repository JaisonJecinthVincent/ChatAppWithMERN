import cluster from 'cluster';
import os from 'os';
import { createServer } from 'http';
import { initializeSocket } from './src/lib/socket.js';
import app from './app.js'; // Import the configured Express app

// --- Configuration ---
const numCPUs = os.cpus().length;
const MAX_WORKERS = process.env.MAX_WORKERS ? parseInt(process.env.MAX_WORKERS) : Math.min(numCPUs, 4);
const PORT = process.env.PORT || 5000;
const WORKER_RESTART_DELAY = 1000; // 1 second

// --- Primary Process Logic ---
if (cluster.isPrimary) {
    console.log(`🚀 Master Process Starting... (PID: ${process.pid})`);
    console.log(`📊 Found ${numCPUs} CPU Cores. Will spawn ${MAX_WORKERS} workers.`);

    const server = createServer(app);

    // Setup Socket.IO on the master server instance before listening
    initializeSocket(server);

    // The master process listens on the port
    server.listen(PORT, () => {
        console.log(`✅ Master server is listening on port ${PORT}`);
    });

    // Fork workers
    for (let i = 0; i < MAX_WORKERS; i++) {
        cluster.fork({ WORKER_ID: i + 1 });
    }

    // Handle worker exit and restart
    cluster.on('exit', (worker, code, signal) => {
        const workerId = worker.process.env.WORKER_ID || worker.id;
        console.log(`💥 Worker ${workerId} (PID: ${worker.process.pid}) died. Code: ${code}, Signal: ${signal}.`);
        if (code !== 0 && !worker.exitedAfterDisconnect) {
            setTimeout(() => {
                console.log(`🔄 Restarting worker ${workerId}...`);
                cluster.fork({ WORKER_ID: workerId });
            }, WORKER_RESTART_DELAY);
        }
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
        console.log('\n🛑 Received shutdown signal. Closing workers...');
        cluster.disconnect(() => {
            console.log('👋 All workers disconnected. Master shutting down.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

} else {
    // --- Worker Process Logic ---
    const workerId = process.env.WORKER_ID;
    console.log(`🔥 Worker ${workerId} (PID: ${process.pid}) started.`);
    // Workers do not call server.listen(). The master process handles it.
    // The Express app logic is already loaded via the import.
}
